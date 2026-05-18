from decimal import Decimal
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

try:
    import fitz
except ImportError:  # pragma: no cover - optional until dependencies are installed
    fitz = None

try:
    from PIL import Image as PILImage
except ImportError:  # pragma: no cover - optional runtime dependency
    PILImage = None

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Image as ReportLabImage
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from core.models import BusinessProfile


INK = colors.HexColor("#111827")
MUTED = colors.HexColor("#5f6673")
LINE = colors.HexColor("#d9dee8")
SURFACE = colors.HexColor("#f8fafc")
WORKSPACE = colors.HexColor("#e8ecf1")
BRAND_DARK = colors.HexColor("#0b2447")
PRIMARY = colors.HexColor("#0284c7")
PRIMARY_DARK = colors.HexColor("#0369a1")
ACCENT = colors.HexColor("#0ea5e9")
ACCENT_SOFT = colors.HexColor("#eaf6ff")
WHITE = colors.white


def money(value):
    amount = Decimal(value or 0).quantize(Decimal("0.01"))
    integer, decimals = f"{abs(amount):.2f}".split(".")
    groups = []
    while integer:
        groups.insert(0, integer[-3:])
        integer = integer[:-3]
    sign = "-" if amount < 0 else ""
    return f"{sign}$ {'.'.join(groups)},{decimals}"


def percentage(value):
    amount = Decimal(value or 0).quantize(Decimal("0.01"))
    return f"{amount:.2f}%".replace(".", ",")


def date_label(value):
    if not value:
        return "Sin fecha"
    return value.strftime("%d/%m/%Y") if hasattr(value, "strftime") else str(value)


def cuit_label(value):
    digits = "".join(character for character in str(value or "") if character.isdigit())
    if len(digits) == 11:
        return f"{digits[:2]}-{digits[2:10]}-{digits[10:]}"
    return str(value or "")


def has_value(value):
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    return bool(value)


def has_amount(value):
    return Decimal(value or 0).quantize(Decimal("0.01")) != Decimal("0.00")


def plain_text_as_markup(text):
    return "<br/>".join(escape(str(line)) for line in str(text or "").splitlines())


def paragraph(text, style):
    return Paragraph(plain_text_as_markup(text) or "&nbsp;", style)


def markup(text, style):
    return Paragraph(str(text or "") or "&nbsp;", style)


def quote_item_service_label(item):
    icon = ""
    if item.service_id and item.service:
        icon = str(item.service.icon or "").strip()
    return f"{icon} {item.description}" if icon else item.description


def style_sheet():
    return {
        "brand": ParagraphStyle(
            "QuoteBrand",
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=19,
            textColor=INK,
        ),
        "brand_meta": ParagraphStyle(
            "QuoteBrandMeta",
            fontName="Helvetica",
            fontSize=8.5,
            leading=11,
            textColor=MUTED,
        ),
        "app_brand": ParagraphStyle(
            "QuoteAppBrand",
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            textColor=BRAND_DARK,
            alignment=TA_CENTER,
        ),
        "app_brand_meta": ParagraphStyle(
            "QuoteAppBrandMeta",
            fontName="Helvetica",
            fontSize=7,
            leading=9,
            textColor=MUTED,
            alignment=TA_CENTER,
        ),
        "code_label": ParagraphStyle(
            "QuoteCodeLabel",
            fontName="Helvetica-Bold",
            fontSize=7,
            leading=9,
            textColor=PRIMARY_DARK,
            alignment=TA_RIGHT,
        ),
        "code": ParagraphStyle(
            "QuoteCode",
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=18,
            textColor=BRAND_DARK,
            alignment=TA_RIGHT,
        ),
        "code_meta": ParagraphStyle(
            "QuoteCodeMeta",
            fontName="Helvetica",
            fontSize=8.5,
            leading=11,
            textColor=MUTED,
            alignment=TA_RIGHT,
        ),
        "section": ParagraphStyle(
            "QuoteSection",
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=13,
            textColor=INK,
        ),
        "body": ParagraphStyle(
            "QuoteBody",
            fontName="Helvetica",
            fontSize=8.8,
            leading=12,
            textColor=INK,
        ),
        "small": ParagraphStyle(
            "QuoteSmall",
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=MUTED,
        ),
        "service_note": ParagraphStyle(
            "QuoteServiceNote",
            fontName="Helvetica",
            fontSize=7.8,
            leading=10,
            textColor=MUTED,
            leftIndent=0,
            spaceBefore=2,
        ),
        "table_header": ParagraphStyle(
            "QuoteTableHeader",
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=10,
            textColor=WHITE,
            alignment=TA_CENTER,
        ),
        "right": ParagraphStyle(
            "QuoteRight",
            fontName="Helvetica",
            fontSize=8.8,
            leading=11,
            textColor=INK,
            alignment=TA_RIGHT,
        ),
        "right_bold": ParagraphStyle(
            "QuoteRightBold",
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=11,
            textColor=INK,
            alignment=TA_RIGHT,
        ),
        "total": ParagraphStyle(
            "QuoteTotal",
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=15,
            textColor=WHITE,
            alignment=TA_RIGHT,
        ),
        "fallback_logo": ParagraphStyle(
            "QuoteFallbackLogo",
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            textColor=PRIMARY_DARK,
            alignment=TA_CENTER,
        ),
    }


def logo_image_flowable(image_source, max_width=32 * mm, max_height=22 * mm):
    reader = ImageReader(image_source)
    width, height = reader.getSize()
    if hasattr(image_source, "seek"):
        image_source.seek(0)
    ratio = min(max_width / width, max_height / height)
    return ReportLabImage(image_source, width * ratio, height * ratio)


def vector_logo(path, max_width=32 * mm, max_height=22 * mm):
    if not fitz or path.suffix.lower() not in {".pdf", ".svg"}:
        return None
    document = None
    try:
        document = fitz.open(str(path))
        if document.page_count < 1:
            return None
        page = document.load_page(0)
        pixmap = page.get_pixmap(matrix=fitz.Matrix(3, 3), alpha=True)
        image_buffer = BytesIO(pixmap.tobytes("png"))
        image_buffer.seek(0)
        flowable = logo_image_flowable(image_buffer, max_width=max_width, max_height=max_height)
        flowable._quote_logo_buffer = image_buffer
        return flowable
    except Exception:
        return None
    finally:
        if document:
            document.close()


def vector_logo_bytes(filename, content, max_width=32 * mm, max_height=22 * mm):
    suffix = Path(filename).suffix.lower()
    if not fitz or suffix not in {".pdf", ".svg"}:
        return None
    document = None
    try:
        document = fitz.open(stream=content, filetype=suffix.lstrip("."))
        if document.page_count < 1:
            return None
        page = document.load_page(0)
        pixmap = page.get_pixmap(matrix=fitz.Matrix(3, 3), alpha=True)
        image_buffer = BytesIO(pixmap.tobytes("png"))
        image_buffer.seek(0)
        flowable = logo_image_flowable(image_buffer, max_width=max_width, max_height=max_height)
        flowable._quote_logo_buffer = image_buffer
        return flowable
    except Exception:
        return None
    finally:
        if document:
            document.close()


def raster_logo(path, max_width=32 * mm, max_height=22 * mm):
    def build_image(image_source):
        return logo_image_flowable(image_source, max_width=max_width, max_height=max_height)

    if PILImage:
        try:
            image_buffer = BytesIO()
            with PILImage.open(path) as image:
                if image.mode not in {"RGB", "RGBA"}:
                    image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
                image.save(image_buffer, format="PNG")
            image_buffer.seek(0)
            flowable = build_image(image_buffer)
            flowable._quote_logo_buffer = image_buffer
            return flowable
        except Exception:
            pass

    try:
        return build_image(str(path))
    except Exception:
        return None


def raster_logo_bytes(content, max_width=32 * mm, max_height=22 * mm):
    def build_image(image_source):
        return logo_image_flowable(image_source, max_width=max_width, max_height=max_height)

    if PILImage:
        try:
            image_buffer = BytesIO()
            with PILImage.open(BytesIO(content)) as image:
                if image.mode not in {"RGB", "RGBA"}:
                    image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
                image.save(image_buffer, format="PNG")
            image_buffer.seek(0)
            flowable = build_image(image_buffer)
            flowable._quote_logo_buffer = image_buffer
            return flowable
        except Exception:
            pass

    try:
        image_buffer = BytesIO(content)
        flowable = build_image(image_buffer)
        flowable._quote_logo_buffer = image_buffer
        return flowable
    except Exception:
        return None


def image_logo(path, max_width=32 * mm, max_height=22 * mm):
    if not path.exists():
        return None
    if path.suffix.lower() in {".pdf", ".svg"}:
        return vector_logo(path, max_width=max_width, max_height=max_height)
    return raster_logo(path, max_width=max_width, max_height=max_height)


def image_logo_bytes(filename, content, max_width=32 * mm, max_height=22 * mm):
    if Path(filename).suffix.lower() in {".pdf", ".svg"}:
        return vector_logo_bytes(filename, content, max_width=max_width, max_height=max_height)
    return raster_logo_bytes(content, max_width=max_width, max_height=max_height)


def storage_logo(file_field, max_width=32 * mm, max_height=22 * mm):
    try:
        file_field.open("rb")
        content = file_field.read()
    except Exception:
        return None
    finally:
        try:
            file_field.close()
        except Exception:
            pass
    if not content:
        return None
    return image_logo_bytes(file_field.name, content, max_width=max_width, max_height=max_height)


def bundled_logo_path(variant="light"):
    filename = "shineapp-logo-dark.png" if variant == "dark" else "shineapp-logo.png"
    packaged_path = Path(__file__).with_name(filename)
    if packaged_path.exists():
        return packaged_path
    repo_root = Path(__file__).resolve().parents[2]
    path = repo_root / "frontend" / "public" / filename
    return path if path.exists() else None


def app_brand_block(styles):
    logo_path = bundled_logo_path()
    logo = image_logo(logo_path, max_width=12 * mm, max_height=12 * mm) if logo_path else None
    rows = []
    if logo:
        rows.append([logo])
    rows.append([paragraph("ShineApp", styles["app_brand"])])
    block = Table(rows, colWidths=[34 * mm])
    block.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    return block


def business_logo_path(business_name):
    if str(business_name or "").strip().lower() != "shineapp":
        return None
    return bundled_logo_path()


def logo_flowable(styles, business_name, business=None):
    try:
        profile = BusinessProfile.get_solo(business=business)
    except Exception:
        profile = None

    if profile and profile.logo:
        logo = storage_logo(profile.logo)
        if logo:
            return logo

    default_logo = business_logo_path(business_name)
    if default_logo:
        logo = image_logo(default_logo)
        if logo:
            return logo

    return fallback_logo(styles, business_name)


def business_initials(name):
    words = [word for word in str(name or "ShineApp").split() if word]
    initials = "".join(word[0] for word in words[:3]).upper()
    return initials or "SA"


def fallback_logo(styles, business_name):
    return Table(
        [[paragraph(business_initials(business_name), styles["fallback_logo"])]],
        colWidths=[33 * mm],
        rowHeights=[22 * mm],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), ACCENT_SOFT),
                ("BOX", (0, 0), (-1, -1), 1.2, colors.HexColor("#bae6fd")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        ),
    )


def profile_lines(quote):
    lines = []
    if quote.business_address:
        lines.append(quote.business_address)
    fiscal = []
    if quote.business_cuit:
        fiscal.append(f"CUIT {cuit_label(quote.business_cuit)}")
    if quote.business_vat_condition_label:
        fiscal.append(quote.business_vat_condition_label)
    if fiscal:
        lines.append(" | ".join(fiscal))
    contact = []
    if quote.business_contact_phone:
        contact.append(quote.business_contact_phone)
    if quote.business_contact_email:
        contact.append(quote.business_contact_email)
    if contact:
        lines.append(" | ".join(contact))
    return lines


def info_card(title, rows, styles):
    content = [[paragraph(title.upper(), styles["section"])]]
    body = []
    for label, value in rows:
        if has_value(value):
            body.append(f"<b>{escape(str(label))}:</b> {plain_text_as_markup(value)}")
    if body:
        content.append([markup("<br/>".join(body), styles["body"])])
    return Table(
        content,
        colWidths=[84 * mm],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), WHITE),
                ("BOX", (0, 0), (-1, -1), 0.8, LINE),
                ("LINEBELOW", (0, 0), (-1, 0), 1.2, ACCENT),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        ),
    )


def service_cell(item, styles):
    content = [paragraph(quote_item_service_label(item), styles["body"])]
    if item.service_id and item.service and has_value(item.service.notes):
        content.append(paragraph(item.service.notes, styles["service_note"]))
    return content


def services_table(quote, items, styles):
    rows = [
        [
            paragraph("SERVICIO", styles["table_header"]),
            paragraph("CANT.", styles["table_header"]),
            paragraph("PRECIO", styles["table_header"]),
            paragraph("TOTAL", styles["table_header"]),
        ]
    ]
    for item in items:
        rows.append(
            [
                service_cell(item, styles),
                paragraph(str(item.quantity).replace(".", ","), styles["right"]),
                paragraph(money(item.unit_price), styles["right"]),
                paragraph(money(item.line_total), styles["right_bold"]),
            ]
        )

    table = Table(rows, colWidths=[90 * mm, 22 * mm, 34 * mm, 34 * mm], repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("BOX", (0, 0), (-1, -1), 0.8, LINE),
        ("GRID", (0, 1), (-1, -1), 0.45, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]
    for row_index in range(1, len(rows)):
        if row_index % 2 == 0:
            style.append(("BACKGROUND", (0, row_index), (-1, row_index), SURFACE))
    table.setStyle(TableStyle(style))
    return table


def totals_table(quote, styles):
    has_discount = has_amount(quote.discount_rate) or has_amount(quote.discount_amount)
    has_tax = has_amount(quote.tax_rate) or has_amount(quote.tax_amount)
    rows = [["Subtotal", money(quote.subtotal)]]
    if has_discount:
        rows.append([f"Descuento global ({percentage(quote.discount_rate)})", f"- {money(quote.discount_amount)}"])
    if has_discount or has_tax:
        rows.append(["Base imponible", money(quote.taxable_amount)])
    if has_tax:
        rows.append([f"IVA ({percentage(quote.tax_rate)})", money(quote.tax_amount)])
    rows.append(["TOTAL", money(quote.total)])
    table_rows = [
        [paragraph(label, styles["right"]), paragraph(value, styles["right_bold"])]
        for label, value in rows[:-1]
    ]
    table_rows.append(
        [paragraph(rows[-1][0], styles["total"]), paragraph(rows[-1][1], styles["total"])]
    )
    table = Table(table_rows, colWidths=[50 * mm, 42 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -2), WHITE),
                ("BACKGROUND", (0, -1), (-1, -1), PRIMARY),
                ("BOX", (0, 0), (-1, -1), 0.8, LINE),
                ("LINEABOVE", (0, -1), (-1, -1), 1.4, ACCENT),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def note_box(title, text, styles):
    if not has_value(text):
        return None
    return Table(
        [
            [paragraph(title.upper(), styles["section"])],
            [paragraph(text, styles["body"])],
        ],
        colWidths=[180 * mm],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), WHITE),
                ("BOX", (0, 0), (-1, -1), 0.8, LINE),
                ("LINEBELOW", (0, 0), (-1, 0), 1.2, ACCENT),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        ),
    )


def draw_page(canvas, doc):
    width, height = A4
    canvas.saveState()
    canvas.setFillColor(WORKSPACE)
    canvas.rect(0, 0, width, height, stroke=0, fill=1)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7)
    canvas.drawRightString(width - 14 * mm, 9 * mm, f"Pagina {doc.page}")
    canvas.restoreState()


def build_quote_pdf(quote):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=14 * mm,
        rightMargin=14 * mm,
        topMargin=13 * mm,
        bottomMargin=16 * mm,
        pageCompression=0,
        title=f"Cotizacion {quote.public_code or quote.id}",
    )
    styles = style_sheet()
    quote_items = list(quote.items.select_related("service").all())
    business_name = quote.business_name or "ShineApp"

    story = []
    header_meta = profile_lines(quote)
    business_block = Table(
        [
            [
                logo_flowable(styles, business_name, business=quote.business),
                [
                    paragraph(business_name.upper(), styles["brand"]),
                    markup("<br/>".join(plain_text_as_markup(line) for line in header_meta), styles["brand_meta"]),
                ],
            ]
        ],
        colWidths=[24 * mm, 44 * mm],
    )
    business_block.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    header = Table(
        [
            [
                business_block,
                app_brand_block(styles),
                [
                    paragraph("DOCUMENTO COMERCIAL", styles["code_label"]),
                    paragraph(f"COTIZACION {quote.public_code or quote.id}", styles["code"]),
                    markup(
                        f"Fecha: {plain_text_as_markup(date_label(quote.quote_date))}<br/>Estado: {plain_text_as_markup(quote.status_label)}",
                        styles["code_meta"],
                    ),
                ],
            ]
        ],
        colWidths=[70 * mm, 40 * mm, 70 * mm],
    )
    header.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), WHITE),
                ("BOX", (0, 0), (-1, -1), 0.8, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (1, 0), (1, 0), "CENTER"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ("LINEBELOW", (0, 0), (-1, -1), 1.4, PRIMARY),
            ]
        )
    )
    story.append(header)
    story.append(Spacer(1, 10))

    customer_card = info_card(
        "Cliente",
        [
            ("Nombre", quote.customer_snapshot_name or quote.customer),
            ("CUIT/DNI", cuit_label(quote.customer_snapshot_tax_id)),
            ("Domicilio fiscal", quote.customer_snapshot_billing_address),
            ("Telefono", quote.customer_snapshot_phone),
            ("Email", quote.customer_snapshot_email),
        ],
        styles,
    )
    quote_card = info_card(
        "Vehiculo y validez",
        [
            ("Vehiculo", quote.vehicle_snapshot_label),
            ("Valida hasta", date_label(quote.valid_until) if quote.valid_until else ""),
            ("Reserva vinculada", "Si" if quote.has_reservation else ""),
            ("Fecha tentativa", date_label(quote.reservation_day) if quote.reservation_day else ""),
        ],
        styles,
    )
    cards = Table([[customer_card, quote_card]], colWidths=[88 * mm, 88 * mm])
    cards.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
    story.append(cards)
    story.append(Spacer(1, 11))

    story.append(paragraph("SERVICIOS COTIZADOS", styles["section"]))
    story.append(Spacer(1, 5))
    story.append(services_table(quote, quote_items, styles))
    story.append(Spacer(1, 10))

    observations = note_box("Observaciones", quote.observations, styles) or Spacer(84 * mm, 1)
    totals_row = Table([[observations, totals_table(quote, styles)]], colWidths=[84 * mm, 96 * mm])
    totals_row.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(totals_row)
    for title, text in (
        ("Terminos y condiciones", quote.terms),
        ("Instrucciones de pago", quote.payment_instructions),
    ):
        box = note_box(title, text, styles)
        if box:
            story.append(Spacer(1, 8))
            story.append(box)

    doc.build(story, onFirstPage=draw_page, onLaterPages=draw_page)
    buffer.seek(0)
    return buffer
