# Rebuilds img/ui from the source art in "web icons/": round icons are redrawn
# through an antialiased circular mask, free-form art gets feathered edges.
#   powershell -ExecutionPolicy Bypass -File tools/build-icons.ps1 -src "web icons" -dst img/ui
param($src, $dst)
$code = @"
using System; using System.Drawing; using System.Drawing.Imaging; using System.Drawing.Drawing2D; using System.Runtime.InteropServices;
public static class Ico {
  static byte[] Read(Bitmap b, out int stride) {
    var d = b.LockBits(new Rectangle(0,0,b.Width,b.Height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    stride = d.Stride; var a = new byte[stride*b.Height]; Marshal.Copy(d.Scan0, a, 0, a.Length); b.UnlockBits(d); return a;
  }
  static void Write(Bitmap b, byte[] a) {
    var d = b.LockBits(new Rectangle(0,0,b.Width,b.Height), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
    Marshal.Copy(a, 0, d.Scan0, a.Length); b.UnlockBits(d);
  }
  static Bitmap Load(string p) { using (var i = Image.FromFile(p)) { var b = new Bitmap(i.Width, i.Height, PixelFormat.Format32bppArgb); using (var g = Graphics.FromImage(b)) g.DrawImage(i, 0, 0, i.Width, i.Height); return b; } }

  // Round button art: fit a circle to the opaque pixels (or, for the labelled
  // tiles, to the icon disc above the label) and redraw it through an
  // antialiased circular mask.
  public static string Circle(string src, string dst, int S, double inset, bool tile) {
    var b = Load(src); int st; var px = Read(b, out st); int W = b.Width, H = b.Height;
    Func<int,int,int> at = (x,y) => y*st + x*4;
    double cx, cy, r;
    if (!tile) {
      int x0=W,y0=H,x1=0,y1=0;
      for (int y=0;y<H;y++) for (int x=0;x<W;x++) if (px[at(x,y)+3] >= 200) { if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
      cx=(x0+x1+1)/2.0; cy=(y0+y1+1)/2.0; r=Math.Min(x1-x0+1,y1-y0+1)/2.0*inset;
    } else {
      int bi = at((int)(W*0.16),(int)(H*0.16)); int bB=px[bi],bG=px[bi+1],bR=px[bi+2];
      Func<int,int,bool> hit = (x,y) => { int i=at(x,y); return px[i+3]>=200 && Math.Abs(px[i]-bB)+Math.Abs(px[i+1]-bG)+Math.Abs(px[i+2]-bR) > 70; };
      int y0=H,y1=0;
      for (int y=(int)(H*0.05); y<(int)(H*0.58); y++) for (int x=(int)(W*0.2); x<(int)(W*0.8); x++) { int i=at(x,y); bool white=px[i]>200&&px[i+1]>200&&px[i+2]>200; /* glyphs and pale tile borders */ if (hit(x,y)&&!white){ if(y<y0)y0=y; if(y>y1)y1=y; } }
      // The bottom edge (scanned up from below the disc) and the width are
      // reliable. The top is not: the tile border above passes the same test.
      // So: centre = bottom - half width, re-measuring the width on that row.
      int bt=(int)(H*0.6); int mid=(int)(W/2);
      while (bt>y0 && !hit(mid,bt)) bt--;
      int row=(y0+y1)/2, l=0, rr=0;
      for (int pass=0; pass<3; pass++) {
        l=(int)(W*0.15); rr=(int)(W*0.85);
        while (l<W/2 && !hit(l,row)) l++; while (rr>W/2 && !hit(rr,row)) rr--;
        row=(int)Math.Round(bt-(rr-l)/2.0);
      }
      cx=(l+rr)/2.0; cy=bt-(rr-l)/2.0+0.5; r=(rr-l)/2.0*inset;
    }
    var o = new Bitmap(S, S, PixelFormat.Format32bppArgb);
    using (var g = Graphics.FromImage(o)) using (var ia = new ImageAttributes()) {
      g.InterpolationMode = InterpolationMode.HighQualityBicubic; g.PixelOffsetMode = PixelOffsetMode.HighQuality; g.SmoothingMode = SmoothingMode.HighQuality;
      ia.SetWrapMode(WrapMode.TileFlipXY);
      g.DrawImage(b, new Rectangle(0,0,S,S), (float)(cx-r), (float)(cy-r), (float)(2*r), (float)(2*r), GraphicsUnit.Pixel, ia);
    }
    int os; var op = Read(o, out os); double c = S/2.0, R = S/2.0 - 0.75;
    for (int y=0;y<S;y++) for (int x=0;x<S;x++) {
      // 4x4 supersampled coverage of the disc: a clean, even rim at any size
      int inside=0; for (int sy=0;sy<4;sy++) for (int sx=0;sx<4;sx++) { double dx=x+(sx+0.5)/4-c, dy=y+(sy+0.5)/4-c; if (dx*dx+dy*dy<=R*R) inside++; }
      int i=y*os+x*4; op[i+3]=(byte)(op[i+3]*inside/16);
    }
    Write(o, op); o.Save(dst, ImageFormat.Png); o.Dispose(); b.Dispose();
    return String.Format("{0}: c=({1:F1},{2:F1}) r={3:F1}", System.IO.Path.GetFileName(dst), cx, cy, r);
  }

  // Free-form art: feather the outline with a small blur on alpha only,
  // bleeding the neighbouring colour into new edge pixels (no dark fringe).
  public static void Soften(string src, string dst) {
    var b = Load(src); int st; var p = Read(b, out st); int W=b.Width, H=b.Height; var o = (byte[])p.Clone();
    int[] k = {1,2,1,2,4,2,1,2,1};
    for (int y=0;y<H;y++) for (int x=0;x<W;x++) {
      int i=y*st+x*4; if (p[i+3]==255) { bool solid=true; for(int dy=-1;dy<=1&&solid;dy++) for(int dx=-1;dx<=1;dx++){int xx=x+dx,yy=y+dy; if(xx<0||yy<0||xx>=W||yy>=H||p[yy*st+xx*4+3]<255){solid=false;break;}} if (solid) continue; }
      double a=0, sb=0, sg=0, sr=0, wsum=0; int n=0;
      for (int dy=-1;dy<=1;dy++) for (int dx=-1;dx<=1;dx++,n++) {
        int xx=Math.Min(W-1,Math.Max(0,x+dx)), yy=Math.Min(H-1,Math.Max(0,y+dy)); int j=yy*st+xx*4; double w=k[n], al=p[j+3]/255.0;
        a+=w*al; sb+=w*al*p[j]; sg+=w*al*p[j+1]; sr+=w*al*p[j+2]; wsum+=w;
      }
      a/=wsum; o[i+3]=(byte)Math.Round(a*255);
      if (a>0 && p[i+3]<250) { double aw=a*wsum; o[i]=(byte)(sb/aw); o[i+1]=(byte)(sg/aw); o[i+2]=(byte)(sr/aw); }
    }
    Write(b, o); b.Save(dst, ImageFormat.Png); b.Dispose();
  }
}
"@
Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing
$j = { param($a,$b) Join-Path $a $b }
# labelled tiles -> round icon discs
$tiles = @{ 'annual_teaching_plans_ui'='atp'; 'assessment_tools_ui'='assessment'; 'lesson_plans_ui'='lesson'; 'policies_and_guidelines_ui'='policy';
 'slide_decks_ui'='slides'; 'workbooks_ui'='workbook'; 'cognitive_development_sub'='cognitive'; 'creative_arts_sub'='creative';
 'health_and_wellbeing_sub'='health'; 'life_skills_sub'='lifeskills'; 'physical_development_sub'='physical'; 'social_development_sub'='social' }
foreach ($k in $tiles.Keys) { [Ico]::Circle((& $j $src "$k.png"), (& $j $dst ("ico-" + $tiles[$k] + ".png")), 128, 0.93, $true) }
# round buttons and avatars
$round = @{ 'accessibility_button'='a11y'; 'search_button'='search'; 'home_button'='home'; 'left_button'='left'; 'right_button'='right';
 'up_button'='up'; 'down_button'='down'; 'book_button'='book'; 'settings_icon'='settings';
 'profile1'='profile1'; 'profile2'='profile2'; 'profile3'='profile3'; 'profile4'='profile4'; 'profile5'='profile5' }
foreach ($k in $round.Keys) { [Ico]::Circle((& $j $src "$k.png"), (& $j $dst ($round[$k] + ".png")), 128, 0.96, $false) }
# free-form art
$free = @{ 'text_icon'='chat'; 'cloud_icons'='cloud'; 'trophy_icon'='trophy'; 'star_icons'='star'; 'star_visual'='star-smile'; 'sun_icons'='sun';
 'tablet_icons'='tablet'; 'tablet_visual'='tablet-buddy'; 'book_icons'='books'; 'heart_icon2'='heart'; 'extra_icons'='splash'; 'extra_icons2'='splash2';
 'extra_icons3'='splash3'; 'motivational_visual'='small-steps'; 'motivational_popup'='you-can'; 'kids'='kids'; 'kids_alone'='kid-reading' }
foreach ($k in $free.Keys) { [Ico]::Soften((& $j $src "$k.png"), (& $j $dst ($free[$k] + ".png"))) }
"done"
