"""Build the WebLab vector identity and small-size exports (Python + Pillow)."""
from pathlib import Path
import argparse
import base64
import json
import math
import os
import re
from urllib.parse import quote

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
BRAND = ROOT / "branding"
EXPORTS = BRAND / "icons"
EXTENSION_ROOT = ROOT / "tools/weblab-youtube-cookie-extension"
if not EXTENSION_ROOT.is_dir():
    EXTENSION_ROOT = ROOT / "extension/weblab-cookie-extension"
EXTENSION = EXTENSION_ROOT / "icons"
SIZES = (16, 32, 48, 64, 128, 256)
FROST = "#F4F8FF"
AMBER = "#FFBD59"
MINT = "#74E4CB"
W = [(13,20),(20,20),(25,37),(30,23),(36,23),(41,37),(46,20),
     (53,20),(45,46),(38,46),(33,32),(28,46),(21,46)]
PLAY = [(48,44),(56,49),(48,54)]
TOP = [(15,27),(20,9),(45,10),(50,27)]
BOTTOM = [(49,39),(44,57),(19,56),(14,39)]
ARROWS = [[(43,26),(52,31),(54,20)], [(21,40),(12,35),(10,46)]]

def points(values):
    return " ".join(f"{x},{y}" for x,y in values)

def glyph(sync=False):
    if not sync:
        return f'<polygon points="{points(W)}" fill="{FROST}"/><polygon points="{points(PLAY)}" fill="{AMBER}"/>'
    arcs = '<path d="M15 27C20 9 45 10 50 27M49 39C44 57 19 56 14 39" fill="none" stroke="'+MINT+'" stroke-width="4" stroke-linecap="round"/>'
    arrows = ''.join(f'<polygon points="{points(p)}" fill="{MINT}"/>' for p in ARROWS)
    return arcs + arrows + f'<polygon points="27,24 27,42 41,33" fill="{FROST}"/>'

def svg(sync=False, tile=True):
    background = ''
    if tile:
        background = '<defs><linearGradient id="surface" x2="0" y2="1"><stop stop-color="#294A72"/><stop offset="1" stop-color="#15243F"/></linearGradient></defs><rect x="3" y="3" width="58" height="58" rx="16" fill="url(#surface)" stroke="#6F88A4" stroke-opacity=".55" stroke-width=".8"/>'
    return '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">'+background+glyph(sync)+'</svg>'

def bezier(p):
    result = []
    for i in range(81):
        t = i / 80
        result.append(tuple((1-t)**3*p[0][j]+3*(1-t)**2*t*p[1][j]+3*(1-t)*t*t*p[2][j]+t**3*p[3][j] for j in (0,1)))
    return result

def render(size, sync=False):
    # All geometry uses the same 64-unit master as the SVG; supersample edges.
    resolution = size * 4
    scale = resolution / 64
    image = Image.new('RGBA', (resolution,resolution))
    surface = Image.new('RGBA', image.size)
    d = ImageDraw.Draw(surface)
    start, end = (41,74,114), (21,36,63)
    for y in range(resolution):
        t = y / (resolution-1)
        d.line((0,y,resolution,y), fill=tuple(round(a*(1-t)+b*t) for a,b in zip(start,end))+(255,))
    mask = Image.new('L', image.size)
    ImageDraw.Draw(mask).rounded_rectangle(tuple(v*scale for v in (3,3,61,61)), radius=16*scale, fill=255)
    image.paste(surface, (0,0), mask)
    d = ImageDraw.Draw(image)
    d.rounded_rectangle(tuple(v*scale for v in (3,3,61,61)), radius=16*scale, outline=(91,117,148,210), width=max(1,round(.8*scale)))
    def polygon(p, fill):
        d.polygon([(x*scale,y*scale) for x,y in p], fill=fill)
    if not sync:
        polygon(W,FROST)
        polygon(PLAY,AMBER)
    else:
        for curve in (TOP,BOTTOM):
            p = [(x*scale,y*scale) for x,y in bezier(curve)]
            left, right = [], []
            for i,(x,y) in enumerate(p):
                before,after=p[max(0,i-1)],p[min(len(p)-1,i+1)]
                dx,dy=after[0]-before[0],after[1]-before[1]
                norm=math.hypot(dx,dy)
                ox,oy=-dy/norm*2*scale,dx/norm*2*scale
                left.append((x+ox,y+oy)); right.append((x-ox,y-oy))
            d.polygon(left+right[::-1],fill=MINT)
            for x,y in (p[0],p[-1]):
                d.ellipse((x-2*scale,y-2*scale,x+2*scale,y+2*scale),fill=MINT)
        for p in ARROWS: polygon(p,MINT)
        polygon([(27,24),(27,42),(41,33)],FROST)
    return image.resize((size,size), Image.Resampling.LANCZOS)

def png(image, path):
    # Indexed PNG keeps embedded userscript icons and toolbar exports compact.
    image.quantize(colors=128, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(path, optimize=True)

def preview():
    image = Image.new('RGB',(880,440),'#EFF3F8')
    d = ImageDraw.Draw(image)
    fonts = Path(os.environ.get('SystemRoot','C:/Windows'))/'Fonts'
    def font(size, bold=False):
        return ImageFont.truetype(str(fonts/('segoeuib.ttf' if bold else 'segoeui.ttf')),size)
    d.text((34,22),'WEBLAB',font=font(21,True),fill='#233C60')
    d.text((34,56),'One family. Two clear roles.',font=font(15),fill='#61728B')
    for x,sync,title,caption in [(200,False,'PLAYER','Web button / userscript / Windows'),(630,True,'COOKIE SYNC','Browser toolbar / extension')]:
        icon = render(144,sync)
        image.paste(icon,(x-72,102),icon)
        text_box=d.textbbox((0,0),title,font=font(20,True))
        d.text((x-(text_box[2]-text_box[0])/2,260),title,font=font(20,True),fill='#233C60')
        text_box=d.textbbox((0,0),caption,font=font(13))
        d.text((x-(text_box[2]-text_box[0])/2,291),caption,font=font(13),fill='#61728B')
        for size,offset in [(16,-57),(24,-14),(32,37)]:
            icon=render(size,sync)
            image.paste(icon,(x+offset,335+(32-size)//2),icon)
            d.text((x+offset,378),str(size),font=font(12),fill='#61728B')
    image.save(BRAND/'preview.png', optimize=True)

def embed():
    path = ROOT/'weblab-launcher.user.js'
    if not path.is_file(): path = ROOT/'userscript/external-player-weblab-safe.user.js'
    source = path.read_text(encoding='utf-8')
    source = re.sub(r'^// @icon(?:64)?\s+.*\n','',source,flags=re.M)
    metadata=''
    for label,size in [('icon',32),('icon64',64)]:
        encoded=base64.b64encode((EXPORTS/f'weblab-{size}.png').read_bytes()).decode()
        metadata+=f'// @{label:<24}data:image/png;base64,{encoded}\n'
    source=re.sub(r'^(// @description[^\n]*\n)',lambda m:m[0]+metadata,source,count=1,flags=re.M)
    assignment='    const WEBLAB_MARK_URL = '+json.dumps('data:image/svg+xml,'+quote(svg(tile=False),safe=''))+';'
    if 'const WEBLAB_MARK_URL =' in source:
        source=re.sub(r'    const WEBLAB_MARK_URL = .*?;',lambda _:assignment,source,count=1)
    else:
        source=re.sub(r"(    const VERSION = '[^']+';)",lambda m:m[0]+'\n'+assignment,source,count=1)
    path.write_text(source,encoding='utf-8',newline='\n')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--update-userscript',action='store_true')
    args=parser.parse_args()
    for folder in (BRAND,EXPORTS,EXTENSION): folder.mkdir(parents=True,exist_ok=True)
    for name,sync in [('weblab',False),('cookie-sync',True)]:
        (BRAND/f'{name}.svg').write_text(svg(sync)+'\n',encoding='utf-8')
        for size in SIZES:
            png(render(size,sync),EXPORTS/f'{name}-{size}.png')
            if sync and size<=128: png(render(size,True),EXTENSION/f'icon{size}.png')
    render(256).save(BRAND/'weblab.ico',sizes=[(s,s) for s in SIZES])
    preview()
    if args.update_userscript: embed()
    print('Built vector masters, six-size PNG/ICO exports, extension icons and preview')

if __name__=='__main__': main()
