"""Generate YouTube-style PNG icons (no external deps)."""
import struct, zlib

RED = (255, 0, 0)
WHITE = (255, 255, 255)


def render(size):
    """Return RGBA bytes for a size x size icon: rounded red square + play triangle."""
    s = size
    radius = s * 0.22
    # play triangle bounding box (centered)
    tri_w = s * 0.34
    tri_h = s * 0.40
    tx0 = (s - tri_w) / 2
    ty0 = (s - tri_h) / 2
    px = []
    for y in range(s):
        for x in range(s):
            cx, cy = x + 0.5, y + 0.5
            # rounded-rect mask: clamp to nearest corner-arc center
            rx = radius if cx < radius else (s - radius if cx > s - radius else cx)
            ry = radius if cy < radius else (s - radius if cy > s - radius else cy)
            if ((cx - rx) ** 2 + (cy - ry) ** 2) ** 0.5 > radius:
                px += [0, 0, 0, 0]
                continue
            # play triangle: white if inside
            ry = (cy - ty0) / tri_h
            in_tri = False
            if 0 <= ry <= 1:
                # triangle narrows toward the right; symmetric vertically
                edge = abs(ry - 0.5) * 2  # 0 at mid, 1 at top/bottom
                if cx - tx0 <= tri_w * (1 - edge) and cx >= tx0:
                    in_tri = True
            r, g, b = WHITE if in_tri else RED
            px += [r, g, b, 255]
    return bytes(px), s


def write_png(path, size):
    raw, s = render(size)
    rows = b"".join(b"\x00" + raw[i * s * 4:(i + 1) * s * 4] for i in range(s))
    comp = zlib.compress(rows, 9)

    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data +
                struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))

    ihdr = struct.pack(">IIBBBBB", s, s, 8, 6, 0, 0, 0)
    png = (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) +
           chunk(b"IDAT", comp) + chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(png)
    print(f"wrote {path} ({s}x{s})")


base = "/Users/garethjax/code/youtube2gemini/SOURCE/icons"
for sz in (16, 48, 128):
    write_png(f"{base}/icon{sz}.png", sz)
