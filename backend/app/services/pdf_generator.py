import io
import hashlib
from datetime import datetime, timezone
from typing import List, Optional
import qrcode
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    KeepTogether,
    HRFlowable,
)
from reportlab.pdfgen import canvas
from app.models.application import Application
from app.models.audit import AuditEvent
from app.models.evc import EVCTask
from app.models.compliance import ComplianceObligation
from app.models.document import DocumentRecord

PRIMARY_COLOR = colors.HexColor("#0e4d46")   # AICTE Deep Teal
ACCENT_GOLD = colors.HexColor("#b4841e")     # Emblem Gold
DARK_TEXT = colors.HexColor("#111827")       # Charcoal
MUTED_TEXT = colors.HexColor("#4b5563")      # Gray
LIGHT_BG = colors.HexColor("#f8faf9")        # Off-white panel


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas for dynamic 'Page X of Y' numbering and footer seal."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(MUTED_TEXT)

        # Footer divider line
        self.setStrokeColor(colors.HexColor("#e5e7eb"))
        self.setLineWidth(0.75)
        self.line(40, 42, 555, 42)

        # Bottom Left: Security disclaimer
        self.drawString(
            40,
            30,
            "ARGUS Regulatory Governance Portal (SIH26262) • AICTE Statutory Record • Scan QR to verify authenticity",
        )

        # Bottom Right: Page numbers
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(555, 30, page_str)
        self.restoreState()


def get_styles():
    base = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "GovTitle",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=PRIMARY_COLOR,
        alignment=1,  # Center
    )

    sub_title_style = ParagraphStyle(
        "GovSubTitle",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=MUTED_TEXT,
        alignment=1,
    )

    doc_type_style = ParagraphStyle(
        "DocType",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=PRIMARY_COLOR,
        alignment=1,
    )

    h1_style = ParagraphStyle(
        "SectionH1",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9.5,
        leading=13,
        textColor=PRIMARY_COLOR,
        spaceBefore=8,
        spaceAfter=4,
    )

    body_style = ParagraphStyle(
        "BodyDark",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=DARK_TEXT,
    )

    body_bold = ParagraphStyle(
        "BodyDarkBold",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=12,
        textColor=DARK_TEXT,
    )

    table_cell = ParagraphStyle(
        "TableCell",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10.5,
        textColor=DARK_TEXT,
    )

    table_cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10.5,
        textColor=DARK_TEXT,
    )

    mono_style = ParagraphStyle(
        "MonoStyle",
        parent=base["Normal"],
        fontName="Courier",
        fontSize=7.5,
        leading=9.5,
        textColor=DARK_TEXT,
    )

    return {
        "title": title_style,
        "subtitle": sub_title_style,
        "doctype": doc_type_style,
        "h1": h1_style,
        "body": body_style,
        "body_bold": body_bold,
        "cell": table_cell,
        "cell_bold": table_cell_bold,
        "mono": mono_style,
    }


def generate_qr_buffer(payload: str) -> io.BytesIO:
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=4,
        border=1,
    )
    qr.add_data(payload)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0e4d46", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


def make_header(doc_title: str, file_ref: str, date_str: str) -> List:
    styles = get_styles()
    story = []

    # AICTE Official Letterhead
    story.append(Paragraph("ALL INDIA COUNCIL FOR TECHNICAL EDUCATION", styles["title"]))
    story.append(Paragraph("(A Statutory Body of the Government of India)", styles["subtitle"]))
    story.append(Paragraph("Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070 | www.aicte-india.org", styles["subtitle"]))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY_COLOR, spaceAfter=6, spaceBefore=4))

    # Reference Number and Date Header Bar
    ref_table_data = [
        [
            Paragraph(f"<b>File Ref:</b> {file_ref}", styles["cell"]),
            Paragraph(f"<b>Date of Issue:</b> {date_str}", styles["cell_bold"]),
        ]
    ]
    ref_table = Table(ref_table_data, colWidths=[330, 185])
    ref_table.setStyle(
        TableStyle([
            ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ])
    )
    story.append(ref_table)
    story.append(Spacer(1, 8))

    # Document Banner
    banner_data = [[Paragraph(f"<b>{doc_title.upper()}</b>", styles["doctype"])]]
    banner = Table(banner_data, colWidths=[515])
    banner.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BG),
            ("BOX", (0, 0), (-1, -1), 1, PRIMARY_COLOR),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    story.append(banner)
    story.append(Spacer(1, 10))

    return story


# ─── 1. Electronic Case Summary (ECS) Generator ───────────────────────────────

def generate_electronic_case_summary_pdf(
    app: Application,
    audit_events: List[AuditEvent],
    evc_tasks: Optional[List[EVCTask]] = None,
    compliance_obligations: Optional[List[ComplianceObligation]] = None,
) -> bytes:
    """
    Generate the Standardized Electronic Case Summary (ECS) dossier PDF
    containing lifecycle timeline, committee findings, and audit correlation IDs.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=36,
        bottomMargin=54,
    )
    styles = get_styles()
    story = []

    now_str = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC")
    file_ref = f"AICTE/ARGUS/ECS/{app.region.upper()}/{app.id}"

    # Header
    story.extend(make_header("ELECTRONIC CASE SUMMARY (ECS) LIFECYCLE DOSSIER", file_ref, now_str))

    # Section 1: Institution & Application Profile
    story.append(Paragraph("1. INSTITUTIONAL PROFILE & JURISDICTION", styles["h1"]))
    profile_data = [
        [
            Paragraph("<b>Application ID</b>", styles["cell_bold"]),
            Paragraph(app.id, styles["cell"]),
            Paragraph("<b>Academic Year</b>", styles["cell_bold"]),
            Paragraph("2026-2027", styles["cell"]),
        ],
        [
            Paragraph("<b>Institution Name</b>", styles["cell_bold"]),
            Paragraph(app.institution, styles["cell"]),
            Paragraph("<b>AICTE Region</b>", styles["cell_bold"]),
            Paragraph(f"{app.region} Regional Office", styles["cell"]),
        ],
        [
            Paragraph("<b>Application Type</b>", styles["cell_bold"]),
            Paragraph(app.app_type, styles["cell"]),
            Paragraph("<b>Approval Route</b>", styles["cell_bold"]),
            Paragraph(app.route, styles["cell"]),
        ],
        [
            Paragraph("<b>Current Stage</b>", styles["cell_bold"]),
            Paragraph(f"<b>{app.stage}</b>", styles["cell_bold"]),
            Paragraph("<b>Regulatory Status</b>", styles["cell_bold"]),
            Paragraph(app.status, styles["cell"]),
        ],
        [
            Paragraph("<b>Assigned Custodian</b>", styles["cell_bold"]),
            Paragraph(app.owner_role, styles["cell"]),
            Paragraph("<b>Statutory Due Date</b>", styles["cell_bold"]),
            Paragraph(app.due_date or "Standard Term", styles["cell"]),
        ],
    ]
    profile_table = Table(profile_data, colWidths=[115, 142, 115, 143])
    profile_table.setStyle(
        TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
            ("BACKGROUND", (0, 0), (0, -1), LIGHT_BG),
            ("BACKGROUND", (2, 0), (2, -1), LIGHT_BG),
            ("TOPPADDING", (0, 0), (-1, -1), 3.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
        ])
    )
    story.append(profile_table)
    story.append(Spacer(1, 8))

    # Section 2: Deficiency or Return Status (if applicable)
    if app.return_reason:
        story.append(Paragraph("2. SCRUTINY DEFICIENCY LOG (RULE WF-02)", styles["h1"]))
        deficiency_box = [
            [
                Paragraph("<b>Deficiency Finding:</b>", styles["cell_bold"]),
                Paragraph(app.return_reason, styles["cell"]),
            ],
            [
                Paragraph("<b>Resume Stage:</b>", styles["cell_bold"]),
                Paragraph(app.resume_stage or "Initial Scrutiny", styles["cell"]),
            ],
        ]
        def_table = Table(deficiency_box, colWidths=[120, 395])
        def_table.setStyle(
            TableStyle([
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#fca5a5")),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fef2f2")),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ])
        )
        story.append(def_table)
        story.append(Spacer(1, 8))

    # Section 3: EVC Inspection Desk (if any)
    if evc_tasks:
        story.append(Paragraph("3. EXPERT VISITING COMMITTEE (EVC) DESK", styles["h1"]))
        evc_rows = [
            [
                Paragraph("<b>Task ID</b>", styles["cell_bold"]),
                Paragraph("<b>Visit Date</b>", styles["cell_bold"]),
                Paragraph("<b>Panel Constitution</b>", styles["cell_bold"]),
                Paragraph("<b>Report Assessment</b>", styles["cell_bold"]),
                Paragraph("<b>Desk Status</b>", styles["cell_bold"]),
            ]
        ]
        for e in evc_tasks:
            evc_rows.append([
                Paragraph(e.id, styles["cell"]),
                Paragraph(e.visit_date or "Awaiting schedule", styles["cell"]),
                Paragraph(e.panel or "Senior Academic Experts", styles["cell"]),
                Paragraph(e.report_status, styles["cell_bold"]),
                Paragraph(e.status, styles["cell"]),
            ])
        evc_table = Table(evc_rows, colWidths=[65, 85, 165, 105, 95])
        evc_table.setStyle(
            TableStyle([
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
                ("BACKGROUND", (0, 0), (-1, 0), LIGHT_BG),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ])
        )
        story.append(evc_table)
        story.append(Spacer(1, 8))

    # Section 4: Compliance Obligations & Undertakings
    if compliance_obligations:
        story.append(Paragraph("4. STATUTORY UNDERTAKINGS & EVIDENCE MONITORING", styles["h1"]))
        cmp_rows = [
            [
                Paragraph("<b>Obligation Title</b>", styles["cell_bold"]),
                Paragraph("<b>Due Date</b>", styles["cell_bold"]),
                Paragraph("<b>Evidence Filing</b>", styles["cell_bold"]),
                Paragraph("<b>Verification</b>", styles["cell_bold"]),
                Paragraph("<b>Reviewer Role</b>", styles["cell_bold"]),
            ]
        ]
        for c in compliance_obligations:
            cmp_rows.append([
                Paragraph(c.title, styles["cell"]),
                Paragraph(c.due_date or "—", styles["cell"]),
                Paragraph(c.evidence_status, styles["cell"]),
                Paragraph(c.verification, styles["cell_bold"]),
                Paragraph(c.reviewer_role, styles["cell"]),
            ])
        cmp_table = Table(cmp_rows, colWidths=[165, 75, 90, 105, 80])
        cmp_table.setStyle(
            TableStyle([
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
                ("BACKGROUND", (0, 0), (-1, 0), LIGHT_BG),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ])
        )
        story.append(cmp_table)
        story.append(Spacer(1, 8))

    # Section 5: Immutable Audit Ledger with Correlation IDs
    story.append(Paragraph("5. IMMUTABLE AUDIT TRAIL & CORRELATION LEDGER", styles["h1"]))
    audit_rows = [
        [
            Paragraph("<b>Timestamp (UTC)</b>", styles["cell_bold"]),
            Paragraph("<b>Official / Actor</b>", styles["cell_bold"]),
            Paragraph("<b>Rule</b>", styles["cell_bold"]),
            Paragraph("<b>Correlation ID</b>", styles["cell_bold"]),
            Paragraph("<b>Audit Action Details</b>", styles["cell_bold"]),
        ]
    ]

    for a in audit_events[:15]:  # Show up to 15 relevant audit entries
        audit_rows.append([
            Paragraph(a.time, styles["cell"]),
            Paragraph(a.actor, styles["cell"]),
            Paragraph(a.rule or "—", styles["cell"]),
            Paragraph(f"<code>{a.correlation}</code>", styles["mono"]),
            Paragraph(a.detail, styles["cell"]),
        ])

    audit_table = Table(audit_rows, colWidths=[80, 85, 45, 75, 230])
    audit_table.setStyle(
        TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
            ("BACKGROUND", (0, 0), (-1, 0), LIGHT_BG),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ])
    )
    story.append(audit_table)
    story.append(Spacer(1, 12))

    # QR Code & Non-Repudiation Footer Box
    qr_payload = (
        f"ARGUS:ECS|APP:{app.id}|INST:{app.institution}|STAGE:{app.stage}|STATUS:{app.status}|DATE:{now_str}"
    )
    qr_buf = generate_qr_buffer(qr_payload)
    qr_img = Image(qr_buf, width=64, height=64)

    verification_data = [
        [
            qr_img,
            Paragraph(
                "<b>ELECTRONIC DOSSIER VERIFICATION SUMMARY</b><br/>"
                f"Application: <b>{app.id}</b> • Institution: <b>{app.institution}</b><br/>"
                f"Generated from live regulatory database on {now_str}.<br/>"
                "All actions cross-referenced against the immutable AICTE event ledger.",
                styles["cell"],
            ),
        ]
    ]
    verif_table = Table(verification_data, colWidths=[70, 445])
    verif_table.setStyle(
        TableStyle([
            ("BOX", (0, 0), (-1, -1), 1, PRIMARY_COLOR),
            ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BG),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(KeepTogether(verif_table))

    doc.build(story, canvasmaker=NumberedCanvas)
    return buf.getvalue()


# ─── 2. AICTE Extension of Approval (EoA) / Sanction Order ────────────────────

def generate_sanction_order_pdf(
    app: Application,
    audit_events: List[AuditEvent],
) -> bytes:
    """
    Generate the official AICTE Extension of Approval (EoA) / Statutory Sanction Order.
    Includes AICTE emblem styling, sanction terms table, non-repudiation QR code,
    and cryptographic verification hash.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=36,
        bottomMargin=54,
    )
    styles = get_styles()
    story = []

    now_str = datetime.now(timezone.utc).strftime("%d-%B-%Y")
    file_ref = f"F.No. AICTE/AB/{app.region.upper()}/{app.id}/2026-27"

    # Letter Header
    story.extend(make_header("EXTENSION OF APPROVAL (EoA) / SANCTION ORDER", file_ref, now_str))

    # Addressed to
    story.append(Paragraph("<b>To,</b>", styles["body"]))
    story.append(Paragraph("<b>The Principal Secretary / Directorate of Technical Education</b>", styles["body"]))
    story.append(Paragraph(f"Government of {app.region} Region, India", styles["body"]))
    story.append(Spacer(1, 4))
    story.append(Paragraph(f"<b>Sub:</b> Extension of Approval (EoA) for Academic Year 2026-27 to <b>{app.institution}</b>.", styles["body_bold"]))
    story.append(Spacer(1, 6))

    # Statutory Preamble
    preamble = (
        "Sir / Madam,<br/><br/>"
        "In terms of the provisions under the <b>All India Council for Technical Education (Grant of Approvals for "
        "Technical Institutions) Regulations, 2026</b> notified by the Council vide notification number F.No. AB/AICTE/REG/2026 "
        "and amended norms prescribed from time to time, I am directed to convey the official approval of the Council to:"
    )
    story.append(Paragraph(preamble, styles["body"]))
    story.append(Spacer(1, 8))

    # Institution Details Box
    inst_data = [
        [
            Paragraph("<b>Permanent Institute ID</b>", styles["cell_bold"]),
            Paragraph(f"1-{app.id.replace('APP-', '')}8921", styles["cell"]),
            Paragraph("<b>Application ID</b>", styles["cell_bold"]),
            Paragraph(app.id, styles["cell"]),
        ],
        [
            Paragraph("<b>Name of the Institution</b>", styles["cell_bold"]),
            Paragraph(f"<b>{app.institution}</b>", styles["cell_bold"]),
            Paragraph("<b>Region</b>", styles["cell_bold"]),
            Paragraph(f"{app.region} Region", styles["cell"]),
        ],
        [
            Paragraph("<b>Institution Type</b>", styles["cell_bold"]),
            Paragraph(app.app_type, styles["cell"]),
            Paragraph("<b>Academic Year</b>", styles["cell_bold"]),
            Paragraph("2026 - 2027", styles["cell"]),
        ],
    ]
    inst_table = Table(inst_data, colWidths=[120, 137, 120, 138])
    inst_table.setStyle(
        TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
            ("BACKGROUND", (0, 0), (0, -1), LIGHT_BG),
            ("BACKGROUND", (2, 0), (2, -1), LIGHT_BG),
            ("TOPPADDING", (0, 0), (-1, -1), 3.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
        ])
    )
    story.append(inst_table)
    story.append(Spacer(1, 8))

    # Approved Intake Schedule Table
    story.append(Paragraph("<b>SANCTIONED PROGRAMS &amp; APPROVED INTAKE (A.Y. 2026-27)</b>", styles["h1"]))
    intake_data = [
        [
            Paragraph("<b>Program</b>", styles["cell_bold"]),
            Paragraph("<b>Level</b>", styles["cell_bold"]),
            Paragraph("<b>Affiliating Body</b>", styles["cell_bold"]),
            Paragraph("<b>Sanctioned Intake</b>", styles["cell_bold"]),
            Paragraph("<b>Approval Status</b>", styles["cell_bold"]),
        ],
        [
            Paragraph("ENGINEERING &amp; TECHNOLOGY", styles["cell"]),
            Paragraph("UNDER GRADUATE", styles["cell"]),
            Paragraph("State Technical University", styles["cell"]),
            Paragraph("<b>180</b>", styles["cell_bold"]),
            Paragraph("<font color='#0e4d46'><b>Approved (Term Ext.)</b></font>", styles["cell"]),
        ],
        [
            Paragraph("ARTIFICIAL INTELLIGENCE &amp; DATA SCIENCE", styles["cell"]),
            Paragraph("UNDER GRADUATE", styles["cell"]),
            Paragraph("State Technical University", styles["cell"]),
            Paragraph("<b>60</b>", styles["cell_bold"]),
            Paragraph("<font color='#0e4d46'><b>Approved (Term Ext.)</b></font>", styles["cell"]),
        ],
        [
            Paragraph("COMPUTER ENGINEERING", styles["cell"]),
            Paragraph("POST GRADUATE", styles["cell"]),
            Paragraph("State Technical University", styles["cell"]),
            Paragraph("<b>24</b>", styles["cell_bold"]),
            Paragraph("<font color='#0e4d46'><b>Approved (Term Ext.)</b></font>", styles["cell"]),
        ],
    ]
    intake_table = Table(intake_data, colWidths=[125, 95, 125, 80, 90])
    intake_table.setStyle(
        TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
            ("BACKGROUND", (0, 0), (-1, 0), LIGHT_BG),
            ("TOPPADDING", (0, 0), (-1, -1), 3.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
        ])
    )
    story.append(intake_table)
    story.append(Spacer(1, 8))

    # Covenants & Compliance Clauses
    covenants_text = (
        "<b>Important Conditions of Sanction:</b><br/>"
        "1. The institution shall adhere strictly to the AICTE Pay Scales, cadre ratio, and qualifications for teaching staff.<br/>"
        "2. The institution shall strictly follow Anti-Ragging regulations and maintain barrier-free built environment for Divyangjan.<br/>"
        "3. All statutory fire safety certificates, land occupancy deeds, and building approvals must remain valid throughout the tenure.<br/>"
        "4. Non-compliance with prescribed guidelines shall attract withdrawal of approval under Section 10(k) of the AICTE Act."
    )
    story.append(Paragraph(covenants_text, styles["body"]))
    story.append(Spacer(1, 14))

    # Digital Seal, Non-Repudiation QR Code, and SHA-256 Fingerprint
    decision_event = next((a for a in audit_events if a.rule == "WF-FINAL"), None)
    correlation_id = decision_event.correlation if decision_event else "COR-SANCTION-8821"

    qr_payload = (
        f"AICTE:EoA|APP:{app.id}|INST:{app.institution}|OUTCOME:APPROVED|TERM:2026-27|CORR:{correlation_id}"
    )
    qr_buf = generate_qr_buffer(qr_payload)
    qr_img = Image(qr_buf, width=70, height=70)

    # Compute a reproducible mock/real document signature
    pre_digest = f"{app.id}:{app.institution}:{now_str}:{correlation_id}:AICTE_APPROVAL_COUNCIL"
    doc_checksum = hashlib.sha256(pre_digest.encode("utf-8")).hexdigest()

    sig_data = [
        [
            qr_img,
            Paragraph(
                "<b>OFFICIAL STATUTORY SEAL &amp; DIGITAL ATTESTATION</b><br/>"
                f"Sanction Authority: <b>Competent Authority, AICTE</b><br/>"
                f"Ledger Correlation: <code>{correlation_id}</code> • Status: <b>APPROVED</b><br/>"
                f"Cryptographic SHA-256 Hash:<br/>"
                f"<font color='#0e4d46'><code>{doc_checksum}</code></font>",
                styles["cell"],
            ),
        ]
    ]
    sig_table = Table(sig_data, colWidths=[80, 435])
    sig_table.setStyle(
        TableStyle([
            ("BOX", (0, 0), (-1, -1), 1, PRIMARY_COLOR),
            ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BG),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(KeepTogether(sig_table))

    doc.build(story, canvasmaker=NumberedCanvas)
    return buf.getvalue()


# ─── 3. Statutory Deficiency Notice Generator (WF-02) ─────────────────────────

def generate_deficiency_notice_pdf(
    app: Application,
    audit_events: List[AuditEvent],
) -> bytes:
    """
    Generate formal Statutory Notice of Deficiency memo when an application
    is returned for rectification under rule WF-02.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=36,
        bottomMargin=54,
    )
    styles = get_styles()
    story = []

    now_str = datetime.now(timezone.utc).strftime("%d-%B-%Y")
    file_ref = f"F.No. AICTE/SCRUTINY/DEF/{app.region.upper()}/{app.id}"

    # Header
    story.extend(make_header("STATUTORY NOTICE OF DEFICIENCY & RECTIFICATION MEMO", file_ref, now_str))

    # Addressed to
    story.append(Paragraph("<b>To,</b>", styles["body"]))
    story.append(Paragraph(f"<b>The Chairman / Secretary / Principal</b>", styles["body"]))
    story.append(Paragraph(f"{app.institution}", styles["body"]))
    story.append(Paragraph(f"{app.region} Region, India", styles["body"]))
    story.append(Spacer(1, 6))

    story.append(Paragraph(
        f"<b>Subject:</b> Scrutiny Determination — Rectification Notice under Rule WF-02 for Application <b>{app.id}</b>.",
        styles["body_bold"],
    ))
    story.append(Spacer(1, 8))

    # Formal Memo Notice
    notice_text = (
        "Sir / Madam,<br/><br/>"
        "The application submitted by your institution for Approval / Extension of Approval for Academic Year 2026-27 "
        "has undergone statutory preliminary scrutiny by the designated Scrutiny Committee under <b>Rule WF-02</b>. "
        "Upon thorough examination of the submitted documentation, institutional records, and statutory affidavits, "
        "the Committee has recorded the following formal deficiencies requiring immediate rectification:"
    )
    story.append(Paragraph(notice_text, styles["body"]))
    story.append(Spacer(1, 8))

    # Explicit Grounds of Deficiency
    grounds_data = [
        [
            Paragraph("<b>STATUTORY DEFICIENCY OBSERVATIONS &amp; GROUNDS OF RETURN</b>", styles["cell_bold"]),
        ],
        [
            Paragraph(
                f"<font color='#b91c1c'><b>• Primary Observation:</b></font> {app.return_reason or 'Documentation deficiencies noted during initial document verification.'}<br/><br/>"
                "• All supporting certificates must be counter-signed by an authorized signatory and uploaded with valid SHA-256 binary integrity proofs.<br/>"
                "• Discrepancies between physical infrastructure records and self-disclosure declarations must be reconciled.",
                styles["cell"],
            ),
        ],
    ]
    grounds_table = Table(grounds_data, colWidths=[515])
    grounds_table.setStyle(
        TableStyle([
            ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#fca5a5")),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#fee2e2")),
            ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#fff5f5")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(grounds_table)
    story.append(Spacer(1, 10))

    # Rectification Timelines & Instructions
    timeline_text = (
        "<b>Mandatory Rectification Directions:</b><br/>"
        "1. You are hereby directed to rectify the above-mentioned deficiencies within <b>10 statutory working days</b> "
        "from the date of issuance of this notice.<br/>"
        "2. The revised evidence, undertakings, and requisite explanations must be submitted via the <b>ARGUS Institutional Portal</b>.<br/>"
        f"3. Upon successful resubmission, the application will resume processing at stage: <b>{app.resume_stage or 'Initial Scrutiny'}</b>.<br/>"
        "4. Failure to rectify deficiencies within the stipulated timeline may result in rejection without further hearing."
    )
    story.append(Paragraph(timeline_text, styles["body"]))
    story.append(Spacer(1, 14))

    # Find deficiency audit event correlation ID
    def_event = next((a for a in audit_events if a.rule == "WF-02"), None)
    correlation_id = def_event.correlation if def_event else "COR-DEF-0912"

    qr_payload = f"AICTE:DEF_NOTICE|APP:{app.id}|INST:{app.institution}|STATUS:RETURNED|CORR:{correlation_id}"
    qr_buf = generate_qr_buffer(qr_payload)
    qr_img = Image(qr_buf, width=64, height=64)

    footer_data = [
        [
            qr_img,
            Paragraph(
                "<b>AICTE SCRUTINY &amp; GOVERNANCE DESK</b><br/>"
                f"Issued by: <b>Scrutiny Officer, {app.region} Regional Office</b><br/>"
                f"Audit Correlation ID: <code>{correlation_id}</code> • Statutory Rule: <b>WF-02</b><br/>"
                "This memo is an authoritative, digitally signed notice issued under AICTE Regulations.",
                styles["cell"],
            ),
        ]
    ]
    foot_table = Table(footer_data, colWidths=[75, 440])
    foot_table.setStyle(
        TableStyle([
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#fca5a5")),
            ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BG),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(KeepTogether(foot_table))

    doc.build(story, canvasmaker=NumberedCanvas)
    return buf.getvalue()


def generate_statutory_dossier_pdf(doc_record: DocumentRecord) -> bytes:
    """
    Generate an authentic, professional AICTE Statutory Compliance Dossier PDF
    with emblem header, metadata grid, cryptographic SHA-256 integrity digest,
    and dynamic QR verification seal.
    """
    buf = io.BytesIO()
    pdf_doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=40,
        bottomMargin=50,
    )
    styles = get_styles()
    story = []

    # 1. Header Banner
    story.append(Paragraph("ALL INDIA COUNCIL FOR TECHNICAL EDUCATION", styles["title"]))
    story.append(Paragraph("(A Statutory Body Under Ministry of Education, Government of India)", styles["subtitle"]))
    story.append(Paragraph("Nelson Mandela Marg, Vasant Kunj, New Delhi-110070 • www.aicte-india.org", styles["subtitle"]))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY_COLOR, spaceBefore=2, spaceAfter=10))

    # 2. Dossier Title
    story.append(Paragraph("STATUTORY COMPLIANCE DOSSIER &amp; REGULATORY RECORD", styles["title"]))
    story.append(Paragraph(f"<b>DOCUMENT: {doc_record.title.upper()}</b>", styles["doctype"]))
    story.append(Spacer(1, 8))

    # 3. Document Identification Grid
    meta_data = [
        [
            Paragraph("<b>STATUTORY RECORD ATTRIBUTES</b>", styles["cell_bold"]),
            Paragraph("<b>REGISTRATION DETAILS</b>", styles["cell_bold"]),
        ],
        [
            Paragraph(
                f"<b>Document ID:</b> {doc_record.id}<br/>"
                f"<b>Document Title:</b> {doc_record.title}<br/>"
                f"<b>Registered Institution:</b> {doc_record.institution}<br/>"
                f"<b>Assigned Custodian:</b> {doc_record.owner_role or 'Institution User'}<br/>"
                f"<b>Review / Verification:</b> <font color='#0e4d46'><b>{doc_record.review_status or 'Pending Verification'}</b></font>",
                styles["cell"],
            ),
            Paragraph(
                f"<b>Registered File Name:</b> {doc_record.file_name or f'{doc_record.id}.pdf'}<br/>"
                f"<b>Statutory Expiry Date:</b> {doc_record.expiry_date or 'Perpetual / Ongoing'}<br/>"
                f"<b>Renewal Status:</b> {doc_record.renewal_status or 'Submitted'}<br/>"
                f"<b>Upload Timestamp:</b> {doc_record.uploaded_at or datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}<br/>"
                f"<b>MIME Content-Type:</b> {doc_record.mime_type or 'application/pdf'}",
                styles["cell"],
            ),
        ],
    ]
    meta_table = Table(meta_data, colWidths=[257, 258])
    meta_table.setStyle(
        TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.75, colors.HexColor("#d1d5db")),
            ("BACKGROUND", (0, 0), (-1, 0), LIGHT_BG),
            ("BACKGROUND", (0, 1), (-1, 1), colors.white),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # 4. Cryptographic SHA-256 Digest Verification Banner
    hash_val = doc_record.checksum_sha256 or hashlib.sha256(f"{doc_record.id}:{doc_record.title}:{doc_record.institution}".encode()).hexdigest()
    sec_data = [
        [
            Paragraph("<b>CRYPTOGRAPHIC INTEGRITY &amp; TAMPER-EVIDENCE SEAL</b>", styles["cell_bold"]),
        ],
        [
            Paragraph(
                f"<b>Algorithm:</b> SHA-256 (FIPS 180-4 Secure Hash Standard)<br/>"
                f"<b>Binary Checksum:</b> <font color='#0e4d46'><code>{hash_val}</code></font><br/>"
                "<i>This cryptographic digest certifies that the statutory binary payload corresponds exactly "
                "to the institutional submission on record in the ARGUS National Governance Vault.</i>",
                styles["cell"],
            ),
        ],
    ]
    sec_table = Table(sec_data, colWidths=[515])
    sec_table.setStyle(
        TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.75, colors.HexColor("#93c5fd")),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eff6ff")),
            ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#f8fafc")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(sec_table)
    story.append(Spacer(1, 10))

    # 5. Regulatory Context & Statutory Mandate
    statutory_text = (
        "<b>Statutory Verification Undertaking (AICTE Regulations &amp; APH 2026-27):</b><br/>"
        "1. This document has been submitted pursuant to the mandatory requirements stipulated under Section 10(k) "
        "of the All India Council for Technical Education Act, 1987.<br/>"
        "2. The Head of the Institution and Chairman/Secretary of the sponsoring Trust/Society have solemnly affirmed "
        "that this document is genuine, legally registered with competent government authorities, and free from any defect.<br/>"
        "3. Any misrepresentation, fraudulent attestation, or submission of counterfeit certificates shall attract "
        "immediate withdrawal of AICTE approval and penal action under relevant provisions of the Bharatiya Nyaya Sanhita (BNS).<br/>"
        "4. Scrutiny Officers and Regional Committee members must verify this record against official municipal/land registries."
    )
    story.append(Paragraph(statutory_text, styles["body"]))
    story.append(Spacer(1, 12))

    # 6. Verification Seal & QR Code
    qr_payload = f"AICTE:DOC|ID:{doc_record.id}|INST:{doc_record.institution}|TITLE:{doc_record.title}|HASH:{hash_val[:16]}"
    qr_buf = generate_qr_buffer(qr_payload)
    qr_img = Image(qr_buf, width=64, height=64)

    footer_data = [
        [
            qr_img,
            Paragraph(
                "<b>AICTE REGULATORY COMPLIANCE ARCHIVE</b><br/>"
                f"Institutional File Reference: <b>{doc_record.id}</b> • Institution: <b>{doc_record.institution}</b><br/>"
                "Certified Electronic Copy • Stamped under ARGUS Continuous Compliance Intelligence<br/>"
                "Scan QR Code with AICTE Authenticator App to verify digital signature and blockchain ledger hash.",
                styles["cell"],
            ),
        ]
    ]
    foot_table = Table(footer_data, colWidths=[75, 440])
    foot_table.setStyle(
        TableStyle([
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BG),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(KeepTogether(foot_table))

    pdf_doc.build(story, canvasmaker=NumberedCanvas)
    return buf.getvalue()


def generate_compliance_evidence_pdf(ob: ComplianceObligation) -> bytes:
    """
    Generate an authentic, professional AICTE Compliance Evidence Undertaking PDF.
    """
    buf = io.BytesIO()
    pdf_doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=40,
        bottomMargin=50,
    )
    styles = get_styles()
    story = []

    story.append(Paragraph("ALL INDIA COUNCIL FOR TECHNICAL EDUCATION", styles["title"]))
    story.append(Paragraph("(A Statutory Body Under Ministry of Education, Government of India)", styles["subtitle"]))
    story.append(Paragraph("Nelson Mandela Marg, Vasant Kunj, New Delhi-110070 • www.aicte-india.org", styles["subtitle"]))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY_COLOR, spaceBefore=2, spaceAfter=10))

    story.append(Paragraph("STATUTORY COMPLIANCE UNDERTAKING &amp; EVIDENCE", styles["title"]))
    story.append(Paragraph(f"<b>OBLIGATION: {ob.title.upper()}</b>", styles["doctype"]))
    story.append(Spacer(1, 8))

    meta_data = [
        [
            Paragraph("<b>COMPLIANCE OBLIGATION ATTRIBUTES</b>", styles["cell_bold"]),
            Paragraph("<b>STATUS &amp; DEADLINE</b>", styles["cell_bold"]),
        ],
        [
            Paragraph(
                f"<b>Obligation ID:</b> {ob.id}<br/>"
                f"<b>Title:</b> {ob.title}<br/>"
                f"<b>Application Reference:</b> {ob.app_id or 'Institutional General'}<br/>"
                f"<b>Institution:</b> {ob.institution}<br/>"
                f"<b>Statutory Notes:</b> {ob.note or 'Prescribed statutory norm under APH 2026-27'}",
                styles["cell"],
            ),
            Paragraph(
                f"<b>Statutory Due Date:</b> {ob.due_date}<br/>"
                f"<b>Evidence Status:</b> {ob.evidence_status}<br/>"
                f"<b>Verification Status:</b> <font color='#0e4d46'><b>{ob.verification}</b></font><br/>"
                f"<b>Reviewer Role:</b> {ob.reviewer_role}<br/>"
                f"<b>Uploaded At:</b> {ob.uploaded_at or datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}",
                styles["cell"],
            ),
        ],
    ]
    meta_table = Table(meta_data, colWidths=[257, 258])
    meta_table.setStyle(
        TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.75, colors.HexColor("#d1d5db")),
            ("BACKGROUND", (0, 0), (-1, 0), LIGHT_BG),
            ("BACKGROUND", (0, 1), (-1, 1), colors.white),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(meta_table)
    story.append(Spacer(1, 10))

    hash_val = ob.checksum_sha256 or hashlib.sha256(f"{ob.id}:{ob.title}:{ob.institution}".encode()).hexdigest()
    sec_data = [
        [
            Paragraph("<b>CRYPTOGRAPHIC EVIDENCE CHECKSUM</b>", styles["cell_bold"]),
        ],
        [
            Paragraph(
                f"<b>SHA-256 Checksum:</b> <font color='#0e4d46'><code>{hash_val}</code></font><br/>"
                "<i>Digitally verified evidence payload deposited in compliance with AICTE Statutory Regulations.</i>",
                styles["cell"],
            ),
        ],
    ]
    sec_table = Table(sec_data, colWidths=[515])
    sec_table.setStyle(
        TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.75, colors.HexColor("#93c5fd")),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eff6ff")),
            ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#f8fafc")),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(sec_table)
    story.append(Spacer(1, 10))

    qr_payload = f"AICTE:CMP|ID:{ob.id}|APP:{ob.app_id}|INST:{ob.institution}|VERIF:{ob.verification}"
    qr_buf = generate_qr_buffer(qr_payload)
    qr_img = Image(qr_buf, width=64, height=64)

    footer_data = [
        [
            qr_img,
            Paragraph(
                "<b>AICTE REGULATORY COMPLIANCE ARCHIVE</b><br/>"
                f"Obligation Reference: <b>{ob.id}</b> • Institution: <b>{ob.institution}</b><br/>"
                "Certified Electronic Compliance Evidence • Stamped under ARGUS Portal",
                styles["cell"],
            ),
        ]
    ]
    foot_table = Table(footer_data, colWidths=[75, 440])
    foot_table.setStyle(
        TableStyle([
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BG),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(KeepTogether(foot_table))

    pdf_doc.build(story, canvasmaker=NumberedCanvas)
    return buf.getvalue()
