"""Optional asset regeneration using Pillow; output is committed for Node builds."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
fonts = root / 'public/assets/fonts'
image = Image.new('RGB', (1200, 630), '#f6f5f0')
draw = ImageDraw.Draw(image)
font = lambda size: ImageFont.truetype(str(fonts / 'instrument-3.ttf'), size)
draw.text((64, 45), 'mew.', font=font(52), fill='#142126')
draw.text((64, 182), 'One purchase.', font=font(77), fill='#142126')
draw.text((64, 274), 'One shared mandate.', font=font(77), fill='#4345ef')
draw.text((67, 442), 'Keep purchasing agents inside one objective.', font=font(28), fill='#53615f')
draw.line((64, 518, 1136, 518), fill='#d8dcd5', width=2)
draw.text((67, 545), 'Interactive prototype · models and payments disabled', font=font(22), fill='#53615f')
draw.ellipse((884, 64, 1098, 159), outline='#4345ef', width=10)
draw.polygon([(988, 34), (1030, 57), (988, 81), (946, 57)], fill='#aad5c5')
draw.polygon([(946, 57), (988, 81), (988, 131), (946, 106)], fill='#17695a')
draw.polygon([(988, 81), (1030, 57), (1030, 106), (988, 131)], fill='#438978')
image.save(root / 'public/assets/mew-social.png', optimize=True)
