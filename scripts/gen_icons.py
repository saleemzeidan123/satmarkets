from PIL import Image, ImageDraw, ImageFont
import os
def font(fs):
    for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf','/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf']:
        if os.path.exists(p): return ImageFont.truetype(p,fs)
    return ImageFont.load_default()
def make(sz):
    img=Image.new('RGB',(sz,sz),'#1C1A15'); d=ImageDraw.Draw(img)
    f=font(int(sz*0.30)); txt='SAT'
    bb=d.textbbox((0,0),txt,font=f); w=bb[2]-bb[0]; h=bb[3]-bb[1]
    d.text(((sz-w)/2-bb[0],(sz-h)/2-bb[1]),txt,fill='#EDE6D8',font=f)
    uw=int(sz*0.34); ux=(sz-uw)//2; uy=int(sz*0.70)
    d.rectangle([ux,uy,ux+uw,uy+max(2,int(sz*0.02))],fill='#3A6EA5')
    return img
make(192).save('public/icon-192.png')
make(512).save('public/icon-512.png')
make(512).save('public/icon-maskable-512.png')
make(180).save('public/apple-touch-icon.png')
print('icons written')
