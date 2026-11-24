"""Juba : rendu procedural de la pub de 5 minutes. Ecrit des images RGB brutes sur stdout."""
import math, random, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS, DUR = 1280, 720, 25, 300
F = "/usr/share/fonts/opentype/inter/"
def font(name, size): return ImageFont.truetype(F + name, size)
F_TITLE = font("InterDisplay-Black.otf", 150)
F_BIG = font("InterDisplay-ExtraBold.otf", 92)
F_CAP = font("Inter-SemiBold.otf", 40)
F_LBL = font("Inter-Bold.otf", 34)
F_CAN = font("InterDisplay-Black.otf", 46)

RED = (200, 24, 58); DEEP = (110, 8, 34); LIME = (128, 196, 44); GOLD = (246, 190, 60)
CREAM = (250, 240, 222); SKY = (120, 196, 240); SEA = (24, 120, 180); SAND = (240, 214, 160)

def lerp(a, b, k): return a + (b - a) * k
def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def ease(k): k = clamp(k); return k * k * (3 - 2 * k)
def mix(c1, c2, k): return tuple(int(lerp(a, b, k)) for a, b in zip(c1, c2))

_grad = {}
def gradient(top, bottom):
    key = (top, bottom)
    if key not in _grad:
        g = Image.new("RGB", (1, H))
        for y in range(H): g.putpixel((0, y), mix(top, bottom, y / (H - 1)))
        _grad[key] = g.resize((W, H))
    return _grad[key].copy()

def text_c(d, xy, s, f, fill, anchor="mm", shadow=True):
    if shadow: d.text((xy[0] + 3, xy[1] + 3), s, font=f, fill=(0, 0, 0), anchor=anchor)
    d.text(xy, s, font=f, fill=fill, anchor=anchor)

def caption(img, s, t, t0, t1):
    """Replique de voix off affichee en sous-titre avec fondu."""
    if not (t0 <= t <= t1): return
    a = min(ease((t - t0) / 0.6), ease((t1 - t) / 0.6))
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    bw = d.textlength(s, font=F_CAP) + 60
    d.rounded_rectangle(((W - bw) / 2, H - 120, (W + bw) / 2, H - 50), 20, fill=(0, 0, 0, int(150 * a)))
    d.text((W / 2, H - 85), s, font=F_CAP, fill=(255, 255, 255, int(255 * a)), anchor="mm")
    img.paste(ov, (0, 0), ov)

def can(d, cx, cy, s=1.0, tab_open=0.0, sweat=True, t=0):
    w, h = 150 * s, 270 * s
    x0, y0 = cx - w / 2, cy - h / 2
    d.rounded_rectangle((x0, y0, x0 + w, y0 + h), int(26 * s), fill=RED)
    d.rectangle((x0 + w * 0.62, y0 + 14 * s, x0 + w * 0.78, y0 + h - 14 * s), fill=(232, 70, 96))
    d.rounded_rectangle((x0 + 6 * s, y0 - 10 * s, x0 + w - 6 * s, y0 + 16 * s), int(10 * s), fill=(205, 205, 212))
    d.ellipse((cx - 18 * s, y0 - 6 * s, cx + 18 * s, y0 + 8 * s), fill=(160, 160, 170))
    ang = tab_open * 70
    tx, ty = cx + 4 * s, y0 - 2 * s
    d.line((tx, ty, tx + 30 * s * math.cos(math.radians(-ang)), ty + 30 * s * math.sin(math.radians(-ang))), fill=(120, 120, 130), width=int(8 * s))
    d.ellipse((cx - 46 * s, cy - 40 * s, cx + 46 * s, cy + 40 * s), fill=CREAM)
    for i in range(5):  # petite fleur d'hibiscus sur l'etiquette
        a = i * 72 + 10
        px, py = cx + 18 * s * math.cos(math.radians(a)), cy - 2 * s + 18 * s * math.sin(math.radians(a))
        d.ellipse((px - 14 * s, py - 14 * s, px + 14 * s, py + 14 * s), fill=RED)
    d.ellipse((cx - 6 * s, cy - 8 * s, cx + 6 * s, cy + 4 * s), fill=GOLD)
    d.text((cx, cy + 82 * s), "JUBA", font=font("InterDisplay-Black.otf", max(10, int(46 * s))), fill=CREAM, anchor="mm")
    if sweat:
        rnd = random.Random(7)
        for i in range(22):
            px = x0 + 12 * s + rnd.random() * (w - 24 * s)
            py = y0 + 24 * s + ((rnd.random() * h + t * 8 * s * (0.5 + rnd.random())) % (h - 40 * s))
            r = (2 + rnd.random() * 4) * s
            d.ellipse((px - r, py - r, px + r, py + r * 1.4), fill=(240, 160, 176))

def bubbles(d, t, n, area, color, seed=1, speed=60, rmax=9, alpha_fill=None):
    x0, y0, x1, y1 = area; rnd = random.Random(seed); hgt = y1 - y0
    for i in range(n):
        bx = x0 + rnd.random() * (x1 - x0); ph = rnd.random() * hgt; sp = speed * (0.6 + rnd.random())
        r = 2 + rnd.random() * rmax
        y = y1 - ((ph + t * sp) % hgt)
        x = bx + math.sin(t * 2 + i) * 6
        d.ellipse((x - r, y - r, x + r, y + r), outline=color, width=2)

def hibiscus(d, cx, cy, r, k):
    for i in range(5):
        a = math.radians(i * 72 - 90 + k * 20)
        px, py = cx + r * 0.55 * math.cos(a), cy + r * 0.55 * math.sin(a)
        rr = r * 0.55 * ease(k)
        d.ellipse((px - rr, py - rr, px + rr, py + rr), fill=RED)
    d.ellipse((cx - r * 0.2, cy - r * 0.2, cx + r * 0.2, cy + r * 0.2), fill=DEEP)
    d.line((cx, cy, cx + r * 0.5 * ease(k), cy - r * 0.6 * ease(k)), fill=GOLD, width=6)

def ginger(d, cx, cy, r, k):
    c = (222, 180, 110)
    for dx, dy, rr in ((0, 0, 1), (-0.7, -0.35, 0.6), (0.75, -0.3, 0.55), (0.2, 0.5, 0.5)):
        rx, ry = r * rr * ease(k), r * rr * 0.6 * ease(k)
        d.ellipse((cx + dx * r - rx, cy + dy * r - ry, cx + dx * r + rx, cy + dy * r + ry), fill=c, outline=(170, 130, 70), width=4)

def lime(d, cx, cy, r, k):
    r = r * ease(k)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(70, 140, 30))
    d.ellipse((cx - r * 0.88, cy - r * 0.88, cx + r * 0.88, cy + r * 0.88), fill=(214, 236, 150))
    for i in range(8):
        a = math.radians(i * 45)
        d.line((cx, cy, cx + r * 0.85 * math.cos(a), cy + r * 0.85 * math.sin(a)), fill=(240, 250, 210), width=5)
    for i in range(8):
        a = math.radians(i * 45 + 22.5)
        px, py = cx + r * 0.5 * math.cos(a), cy + r * 0.5 * math.sin(a)
        d.ellipse((px - r * 0.22, py - r * 0.22, px + r * 0.22, py + r * 0.22), fill=LIME)

def glass(d, cx, by, fill_k, t, ice_k=1.0, tilt=0, liquid=RED):
    """Verre droit, glacons, liquide rouge et bulles."""
    w, h = 220, 320; x0, y0 = cx - w / 2, by - h
    lvl = by - 14 - (h - 40) * fill_k
    if fill_k > 0:
        d.rectangle((x0 + 12, lvl, x0 + w - 12, by - 12), fill=liquid)
        d.rectangle((x0 + 12, lvl - 10, x0 + w - 12, lvl + 4), fill=(255, 220, 226))
    rnd = random.Random(3)
    for i in range(4):
        k = clamp(ice_k * 4 - i)
        target = by - 70 - i * 46 if fill_k < 0.2 else min(lvl + 20 + i * 30, by - 60)
        y = lerp(y0 - 300, target, ease(k)) + math.sin(t * 2 + i) * 3
        x = cx - 60 + (i % 2) * 70 + rnd.random() * 20
        if k > 0: d.rounded_rectangle((x, y, x + 62, y + 52), 10, fill=(225, 245, 255), outline=(170, 210, 235), width=3)
    if fill_k > 0.05:
        bubbles(d, t, 30, (x0 + 20, lvl + 10, x0 + w - 20, by - 16), (255, 200, 210), seed=5, speed=90, rmax=5)
    d.line((x0, y0, x0 + 10, by), fill=(235, 245, 255), width=6)
    d.line((x0 + w, y0, x0 + w - 10, by), fill=(235, 245, 255), width=6)
    d.line((x0 + 10, by, x0 + w - 10, by), fill=(235, 245, 255), width=8)
    d.line((x0 + 30, y0 + 30, x0 + 36, by - 40), fill=(255, 255, 255), width=4)

def skyline(d, base, color, seed=11):
    rnd = random.Random(seed); x = -20
    while x < W:
        bw = 60 + rnd.random() * 90; bh = 120 + rnd.random() * 260
        d.rectangle((x, base - bh, x + bw, base), fill=color); x += bw + 6

def sun(d, cx, cy, r, t, color=GOLD):
    rr = r + 10 * math.sin(t * 2)
    for i in range(16):
        a = math.radians(i * 22.5 + t * 6)
        d.line((cx + (rr + 14) * math.cos(a), cy + (rr + 14) * math.sin(a), cx + (rr + 60) * math.cos(a), cy + (rr + 60) * math.sin(a)), fill=color, width=8)
    d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=color)

def person(d, x, base, h, color, t, ph, arm=0.0, holds=True):
    bob = math.sin(t * 3 + ph) * 6
    d.ellipse((x - h * 0.12, base - h - bob, x + h * 0.12, base - h * 0.76 - bob), fill=color)
    d.rounded_rectangle((x - h * 0.13, base - h * 0.74 - bob, x + h * 0.13, base - h * 0.3 - bob), 18, fill=color)
    d.rectangle((x - h * 0.11, base - h * 0.32 - bob, x - h * 0.02, base), fill=color)
    d.rectangle((x + h * 0.02, base - h * 0.32 - bob, x + h * 0.11, base), fill=color)
    ax = x + h * 0.13; ay = base - h * 0.68 - bob
    ex, ey = ax + h * 0.28 * math.cos(math.radians(-30 - arm * 60)), ay + h * 0.28 * math.sin(math.radians(-30 - arm * 60))
    d.line((ax, ay, ex, ey), fill=color, width=int(h * 0.07))
    if holds: d.rounded_rectangle((ex - 9, ey - 18, ex + 9, ey + 14), 4, fill=RED)

def waves(d, t, top, color, amp=10, n=3):
    for j in range(n):
        y = top + j * 26
        pts = [(x, y + amp * math.sin(x / 70 + t * 1.6 + j)) for x in range(0, W + 20, 20)]
        d.line(pts, fill=color, width=4)

# ---------- scenes ----------
def s_open(t):  # 0-20
    img = Image.new("RGB", (W, H), (0, 0, 0)); d = ImageDraw.Draw(img)
    k = ease((t - 1) / 3)
    if k > 0:
        glow = Image.new("RGB", (W, H), (0, 0, 0)); gd = ImageDraw.Draw(glow)
        gd.ellipse((W / 2 - 260, H / 2 - 260, W / 2 + 260, H / 2 + 260), fill=mix((0, 0, 0), (90, 10, 30), k))
        img = glow.filter(ImageFilter.GaussianBlur(60)); d = ImageDraw.Draw(img)
        can(d, W / 2, H / 2 + 20 + (1 - k) * 60, 1.25, tab_open=ease((t - 5.6) / 0.5), t=t)
    if t > 6:
        bubbles(d, t - 6, int(clamp((t - 6) / 2) * 60), (W / 2 - 200, 0, W / 2 + 200, H / 2 - 120), (255, 150, 170), seed=2, speed=120, rmax=10)
    if t > 12:
        a = ease((t - 12) / 1.5)
        text_c(d, (W / 2 - 330, H / 2), "JU", F_TITLE, mix((0, 0, 0), CREAM, a), shadow=False)
        text_c(d, (W / 2 + 330, H / 2), "BA", F_TITLE, mix((0, 0, 0), CREAM, a), shadow=False)
    return img

def s_heat(t):  # 20-50
    lt = t - 20
    img = gradient((255, 140, 60), (255, 214, 140)); d = ImageDraw.Draw(img)
    sun(d, W / 2 + 300, 170, 90, t)
    skyline(d, H - 60, (150, 64, 40))
    d.rectangle((0, H - 60, W, H), fill=(90, 50, 40))
    for j in range(5):  # air qui ondule
        y = H - 120 - j * 60
        pts = [(x, y + 6 * math.sin(x / 40 + t * 4 + j)) for x in range(0, W + 20, 20)]
        d.line(pts, fill=(255, 200, 150), width=2)
    for i, x in enumerate((260, 520, 860)):
        person(d, x, H - 60, 200, (70, 30, 24), t, i, arm=0.5 + 0.5 * math.sin(t * 6 + i), holds=False)
    a = ease((lt - 3) / 1)
    text_c(d, (180, 130), "38 °C", F_BIG, mix((255, 214, 140), (255, 255, 255), a))
    caption(img, "Il y a des jours où le soleil ne te laisse aucun répit.", t, 23, 33)
    return img

def s_fridge(t):  # 50-70
    lt = t - 50
    img = gradient((30, 22, 30), (60, 40, 46)); d = ImageDraw.Draw(img)
    fx, fy, fw, fh = W / 2 - 200, 90, 400, 560
    d.rounded_rectangle((fx, fy, fx + fw, fy + fh), 20, fill=(210, 230, 240))
    ok = ease((lt - 2) / 3)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
    gd.ellipse((W / 2 - 400, H / 2 - 360, W / 2 + 400, H / 2 + 360), fill=(160, 220, 255, int(90 * ok)))
    glow = glow.filter(ImageFilter.GaussianBlur(50)); img.paste(glow, (0, 0), glow); d = ImageDraw.Draw(img)
    d.rectangle((fx + 20, fy + 20, fx + fw - 20, fy + fh - 20), fill=(225, 245, 255))
    for y in (fy + 200, fy + 380): d.line((fx + 20, y, fx + fw - 20, y), fill=(170, 200, 215), width=6)
    can(d, W / 2, fy + 290 - 40, 0.6, sweat=True, t=t)
    dw = fw * (1 - ok)  # porte qui s'ouvre
    if dw > 4:
        d.rounded_rectangle((fx, fy, fx + dw, fy + fh), 20, fill=(236, 240, 244), outline=(180, 190, 200), width=4)
        d.rounded_rectangle((fx + dw - 40, fy + 200, fx + dw - 24, fy + 340), 6, fill=(150, 160, 170))
    caption(img, "Et puis il y a ce moment.", t, 58, 68)
    return img

def s_ingredients(t):  # 70-100
    lt = t - 70
    img = gradient(CREAM, (246, 220, 200)); d = ImageDraw.Draw(img)
    items = [(hibiscus, "Hibiscus", 0, W * 0.2), (ginger, "Gingembre", 10, W * 0.5), (lime, "Citron vert", 20, W * 0.8)]
    for fn, lbl, st, x in items:
        k = ease((lt - st) / 1.6)
        if k <= 0: continue
        y = H / 2 - 40 + math.sin(t * 1.5 + st) * 8
        fn(d, x, y, 120, k)
        text_c(d, (x, y + 190), lbl, F_LBL, mix(CREAM, DEEP, k), shadow=False)
    caption(img, "L'hibiscus pour la couleur.", t, 71, 79)
    caption(img, "Le gingembre pour le caractère.", t, 81, 89)
    caption(img, "Le citron vert pour l'éclat.", t, 91, 99)
    return img

def s_swirl(t):  # 100-130
    lt = t - 100
    img = gradient((150, 14, 44), (60, 4, 20)); d = ImageDraw.Draw(img)
    cx, cy = W / 2, H / 2
    for i in range(160):
        a = i * 0.39 + lt * (1.2 + (i % 5) * 0.1)
        r = 40 + (i * 2.6 + lt * 30) % 320
        x, y = cx + r * math.cos(a), cy + r * 0.62 * math.sin(a)
        s = 3 + (i % 7)
        d.ellipse((x - s, y - s, x + s, y + s), outline=(255, 170, 190), width=2)
    for fn, st, ox in ((hibiscus, 0, -120), (ginger, 1.2, 0), (lime, 2.4, 120)):
        k = clamp((lt - st) / 4)
        if 0 < k < 1:
            y = lerp(-80, cy, ease(k)); a = k * 6
            fn(d, cx + ox * (1 - k) + 30 * math.cos(a), y, 50 * (1 - 0.6 * k), 1)
    caption(img, "Trois ingrédients. Des milliers de bulles.", t, 108, 120)
    if lt > 22:
        text_c(d, (W / 2, 110), "100 % pétillant", F_BIG, mix((60, 4, 20), CREAM, ease((lt - 22) / 1.5)), shadow=False)
    return img

def s_pour(t):  # 130-160
    lt = t - 130
    img = gradient((40, 30, 40), (90, 40, 50)); d = ImageDraw.Draw(img)
    spot = Image.new("RGBA", (W, H), (0, 0, 0, 0)); sd = ImageDraw.Draw(spot)
    sd.ellipse((W / 2 - 360, 120, W / 2 + 360, H + 120), fill=(255, 200, 210, 60))
    spot = spot.filter(ImageFilter.GaussianBlur(70)); img.paste(spot, (0, 0), spot); d = ImageDraw.Draw(img)
    d.rectangle((0, H - 120, W, H), fill=(50, 24, 30))
    fk = ease((lt - 6) / 14)
    glass(d, W / 2, H - 110, fk * 0.85, t, ice_k=clamp(lt / 5))
    if 6 < lt < 20:  # canette qui verse
        cx, cy = W / 2 + 230, 150
        can(d, cx, cy, 0.7, tab_open=1, sweat=False)
        d.line((cx - 60, cy - 70, W / 2 + 40, H - 110 - 300 * fk * 0.85), fill=RED, width=14)
    return img

def s_sip(t):  # 160-190
    lt = t - 160
    k = ease((lt - 8) / 14)
    img = gradient(mix((255, 140, 60), SKY, k), mix((255, 214, 140), (220, 240, 255), k)); d = ImageDraw.Draw(img)
    sun(d, lerp(W / 2 + 300, W - 180, k), lerp(170, 120, k), lerp(90, 60, k), t)
    if k < 1: skyline(d, H - 60 + 400 * k, mix((150, 64, 40), (255, 214, 140), k))
    if k > 0:
        d.rectangle((0, lerp(H, 430, k), W, H), fill=SEA); d.rectangle((0, lerp(H, 560, k), W, H), fill=SAND)
    lvl = 0.85 - 0.5 * ease((lt - 2) / 6)
    glass(d, W / 2, H - 80, lvl, t)
    caption(img, "Ahh. Voilà.", t, 164, 172)
    return img

def beach_bg(t):
    img = gradient(SKY, (220, 240, 255)); d = ImageDraw.Draw(img)
    sun(d, W - 180, 120, 60, t)
    d.rectangle((0, 430, W, H), fill=SEA)
    waves(d, t, 450, (120, 200, 230), n=4)
    d.rectangle((0, 560, W, H), fill=SAND)
    pts = [(x, 560 + 6 * math.sin(x / 60 + t * 1.4)) for x in range(0, W + 20, 20)]
    d.line(pts, fill=(255, 255, 255), width=8)
    return img, d

def s_beach(t):  # 190-230
    lt = t - 190
    img, d = beach_bg(t)
    cols = [(200, 60, 80), (40, 90, 140), (230, 140, 40), (90, 60, 120), (30, 130, 90)]
    for i, x in enumerate((220, 420, 640, 860, 1060)):
        person(d, x, 680, 230, cols[i], t, i * 1.3, arm=0.5 + 0.5 * math.sin(t * 2 + i))
    if 18 < lt < 24:  # plongeon
        k = (lt - 18) / 3
        x = lerp(900, 1150, clamp(k)); y = 440 - 120 * math.sin(math.pi * clamp(k))
        if k < 1: d.ellipse((x - 16, y - 16, x + 16, y + 16), fill=(70, 40, 40))
        else:
            r = (lt - 21) * 60
            d.arc((1150 - r, 440 - r * 0.3, 1150 + r, 440 + r * 0.3), 180, 360, fill=(255, 255, 255), width=5)
    caption(img, "Juba, ça ne se boit jamais seul très longtemps.", t, 194, 206)
    return img

def s_sunset(t):  # 230-260
    lt = t - 230
    img = gradient((90, 30, 90), (255, 140, 70)); d = ImageDraw.Draw(img)
    sy = 430 - 30 + lt * 1.5
    d.ellipse((W / 2 - 120, sy - 120, W / 2 + 120, sy + 120), fill=(255, 190, 90))
    d.rectangle((0, 430, W, H), fill=(60, 30, 70))
    waves(d, t, 450, (255, 150, 100), amp=6, n=5)
    k = ease((lt - 1) / 4)  # deux verres qui trinquent
    for side in (-1, 1):
        x = W / 2 + side * lerp(380, 120, k)
        glass(d, x, H - 60, 0.7, t, ice_k=1)
    if lt > 5:
        rnd = random.Random(9)
        for i in range(120):  # confettis
            x = rnd.random() * W; y = ((rnd.random() * H) + (lt - 5) * 120 * (0.5 + rnd.random())) % H
            c = (RED, GOLD, LIME, CREAM)[i % 4]
            d.rectangle((x, y, x + 8, y + 14), fill=c)
    caption(img, "À nous. À l'été.", t, 240, 250)
    return img

def s_pack(t):  # 260-285
    lt = t - 260
    img = gradient(RED, DEEP); d = ImageDraw.Draw(img)
    bubbles(d, t, 70, (0, 0, W, H), (255, 140, 160), seed=12, speed=70, rmax=14)
    k = ease(lt / 2)
    can(d, W / 2 - 150, H / 2 + 10 + (1 - k) * 200, 1.3, tab_open=0, t=t)
    glass(d, W / 2 + 160, H / 2 + 190 + (1 - k) * 200, 0.8, t)
    a = ease((lt - 3) / 1.5)
    text_c(d, (W / 2, 80), "Le goût du soleil, en bulles", font("InterDisplay-ExtraBold.otf", 60), mix(RED, CREAM, a))
    caption(img, "Juba. Le goût du soleil, en bulles.", t, 266, 280)
    return img

def s_final(t):  # 285-300
    lt = t - 285
    img = Image.new("RGB", (W, H), (0, 0, 0)); d = ImageDraw.Draw(img)
    k = 1 - ease((lt - 7) / 2)
    if k > 0:
        can(d, W / 2, H / 2 + 20, 1.25, tab_open=ease((lt - 1.6) / 0.5), t=t)
        if lt > 2: bubbles(d, lt - 2, 50, (W / 2 - 200, 0, W / 2 + 200, H / 2 - 120), (255, 150, 170), seed=2, speed=120, rmax=10)
        img = Image.blend(Image.new("RGB", (W, H)), img, k); d = ImageDraw.Draw(img)
    a = ease((lt - 9) / 1.5) * (1 - ease((lt - 13.5) / 1.4))
    text_c(d, (W / 2, H / 2 - 20), "JUBA", F_TITLE, mix((0, 0, 0), CREAM, a), shadow=False)
    text_c(d, (W / 2, H / 2 + 80), "Boisson fictive · Musique : UNIVERSFIELD (CC BY 4.0), code_box (CC0) · Sons : Freesound (CC0)",
           font("Inter-Regular.otf", 20), mix((0, 0, 0), (170, 170, 170), a), shadow=False)
    return img

SCENES = [(0, 20, s_open), (20, 50, s_heat), (50, 70, s_fridge), (70, 100, s_ingredients), (100, 130, s_swirl),
          (130, 160, s_pour), (160, 190, s_sip), (190, 230, s_beach), (230, 260, s_sunset), (260, 285, s_pack), (285, 300, s_final)]

def frame(t):
    for i, (a, b, fn) in enumerate(SCENES):
        if a <= t < b:
            img = fn(t)
            fade = 0.4
            k = min(clamp((t - a) / fade) if i > 0 else 1, clamp((b - t) / fade) if i < len(SCENES) - 1 else 1)
            if k < 1: img = Image.blend(Image.new("RGB", (W, H)), img, k)
            return img
    return Image.new("RGB", (W, H))

if __name__ == "__main__":
    start, end = float(sys.argv[1]), float(sys.argv[2])
    if len(sys.argv) > 3:  # mode apercu : une image PNG
        frame(start).save(sys.argv[3]); sys.exit()
    out = sys.stdout.buffer
    n0, n1 = int(start * FPS), int(end * FPS)
    for n in range(n0, n1): out.write(frame(n / FPS).tobytes())
