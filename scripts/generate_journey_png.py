import os
from PIL import Image, ImageDraw, ImageFont

def create_journey_diagram():
    # Dimensions: 2600 x 1750 (High-res 300dpi equivalent)
    W, H = 2600, 1750
    img = Image.new("RGBA", (W, H), (7, 23, 15, 255))
    draw = ImageDraw.Draw(img)

    # Load system fonts
    font_path = "/System/Library/Fonts/Supplemental/Arial.ttf"
    bold_path = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
    if not os.path.exists(bold_path):
        bold_path = font_path

    f_title = ImageFont.truetype(bold_path, 54)
    f_sub = ImageFont.truetype(font_path, 26)
    f_badge = ImageFont.truetype(bold_path, 20)
    f_phase_num = ImageFont.truetype(bold_path, 22)
    f_phase_title = ImageFont.truetype(bold_path, 28)
    f_role = ImageFont.truetype(bold_path, 20)
    f_step_num = ImageFont.truetype(bold_path, 19)
    f_step_title = ImageFont.truetype(bold_path, 20)
    f_step_desc = ImageFont.truetype(font_path, 17)
    f_legend = ImageFont.truetype(font_path, 20)

    # 1. Background Cyber Grid
    grid_color = (16, 185, 129, 15)
    for x in range(0, W, 50):
        draw.line([(x, 0), (x, H)], fill=grid_color, width=1)
    for y in range(0, H, 50):
        draw.line([(0, y), (W, y)], fill=grid_color, width=1)

    # Subtle ambient gradient glow in center
    # Top banner glow
    draw.ellipse([W//2 - 600, -100, W//2 + 600, 300], fill=(16, 185, 129, 20))

    # 2. Header Section
    # Logo / Emblem placeholder shield
    emblem_x, emblem_y = 100, 60
    draw.rounded_rectangle([emblem_x, emblem_y, emblem_x + 90, emblem_y + 90], radius=18, fill=(13, 40, 26, 255), outline=(16, 185, 129, 200), width=3)
    draw.text((emblem_x + 18, emblem_y + 22), "🛡️", font=f_phase_title, fill=(255, 255, 255, 255))

    # Title & Tagline
    draw.text((emblem_x + 115, emblem_y + 5), "ARGUS: AICTE Approval & Compliance Intelligence", font=f_title, fill=(255, 255, 255, 255))
    draw.text((emblem_x + 118, emblem_y + 68), "Complete End-to-End Regulatory Journey | Approval Process Handbook (APH) 2026-27 Closed-Loop Governance", font=f_sub, fill=(167, 243, 208, 255))

    # Top right status badge
    badge_w, badge_h = 320, 52
    bx, by = W - 100 - badge_w, emblem_y + 18
    draw.rounded_rectangle([bx, by, bx + badge_w, by + badge_h], radius=26, fill=(16, 185, 129, 35), outline=(16, 185, 129, 180), width=2)
    draw.text((bx + 28, by + 14), "● STATUTORY WORKFLOW MAP", font=f_badge, fill=(52, 211, 153, 255))

    # Divider
    draw.line([(100, 180), (W - 100, 180)], fill=(30, 70, 45, 255), width=2)

    # 3. Six Major Phase Cards Grid: 2 rows of 3 columns
    # Row 1 (top): Phase 1, Phase 2, Phase 3
    # Row 2 (bottom): Phase 6, Phase 5, Phase 4 (Flow wraps around smoothly)
    
    col_w = 750
    row_h = 670
    gap_x = 75
    gap_y = 80
    start_x = 100
    start_y = 220

    phases = [
        # (phase_id, phase_label, title, role, role_color, bg_tint, border_color, steps, col, row)
        (
            1, "PHASE 01", "Institutional Application Filing",
            "Actor: Institution User", (16, 185, 129), (10, 32, 22), (16, 185, 129, 160),
            [
                ("01", "Secure Identity Sign In", "Principal / Liaison authenticates via Google Auth / AICTE credentials with MFA."),
                ("02", "Multi-Step Application Wizard", "Enter college code, region, programs, and student intake capacities."),
                ("03", "Mandatory Document Uploads", "Upload Registered Lease Deed, Fire Safety NOC, and Faculty Undertaking with SHA-256."),
                ("04", "Legal Affidavit & Submission", "Sign statutory declaration under APH norms; generate official case ID (APP-2026-XXX).")
            ],
            0, 0
        ),
        (
            2, "PHASE 02", "Scrutiny & Deficiency Loop",
            "Actor: Scrutiny Officer", (245, 158, 11), (32, 26, 10), (245, 158, 11, 160),
            [
                ("05", "Regulatory Norms Verification", "Scrutiny officer inspects land title, built-up area, and faculty cadre ratios."),
                ("06", "Deficiency Notice Issuance (WF-02)", "Formal notice issued with statutory justification; ownership reverts to institution."),
                ("07", "Corrective Evidence Resubmission", "Institution uploads rectified evidence; review resumes at preserved stage."),
                ("08", "Scrutiny Clearance & Approval", "All compliance norms verified; application cleared for Committee inspection.")
            ],
            1, 0
        ),
        (
            3, "PHASE 03", "Expert Visit Committee (EVC)",
            "Actor: Committee Coordinator", (59, 130, 246), (10, 24, 38), (59, 130, 246, 160),
            [
                ("09", "Panel Scheduling & Appointment", "Coordinator assigns 2-3 member expert panel (Chairman + Subject Experts)."),
                ("10", "Physical / Virtual Campus Inspection", "On-site verification of laboratories, library titles, computers, and safety."),
                ("11", "Inspection Report Submission", "Panel records observations, deficiency findings, and recommendation."),
                ("12", "Outcome Advancement", "Status marked 'Satisfactory'; case automatically advances to Regional Review.")
            ],
            2, 0
        ),
        (
            4, "PHASE 04", "Regional Office Review",
            "Actor: Regional Officer", (139, 92, 246), (24, 14, 38), (139, 92, 246, 160),
            [
                ("13", "Dossier & Undertakings Check", "Regional Officer examines EVC findings, land status, and pending conditions."),
                ("14", "Compliance Verification (CMP-01)", "Strict separation of duty: officer validates faculty & infrastructure compliance."),
                ("15", "Document Validity Review (DOC-01)", "Confirms lease deed validity, fire safety validity, and municipal approvals."),
                ("16", "Regional Recommendation", "Case docket forwarded to Competent Authority for statutory decision.")
            ],
            2, 1
        ),
        (
            5, "PHASE 05", "Competent Authority Sanction",
            "Actor: Competent Authority", (234, 179, 8), (35, 30, 8), (234, 179, 8, 160),
            [
                ("17", "Electronic Case Summary (ECS)", "Member Secretary / Bureau Head reviews complete tamper-evident case trail."),
                ("18", "Statutory Determination", "Executive decision recorded: 'Approved' (Case Closed) or 'Rejected'."),
                ("19", "Automated EoA PDF Generation", "Official Extension of Approval sanction order auto-generated with QR verification."),
                ("20", "Non-Repudiation Audit Seal", "Transaction permanently stamped with persistent correlation token (COR-XXXXXX).")
            ],
            1, 1
        ),
        (
            6, "PHASE 06", "Continuous Compliance Monitoring",
            "Actor: Autonomous Rules Daemon", (6, 182, 212), (8, 28, 34), (6, 182, 212, 160),
            [
                ("21", "24/7 Idempotent Policy Sweeps", "Worker daemon checks approaching deadlines (DL-01) and document expiries (DOC-01)."),
                ("22", "Advance Expiry Alerts Dispatched", "Automated reminders dispatched 30 days prior to lease or safety cert expiry."),
                ("23", "Escalation to Higher Authorities", "Overdue compliance escalated to Regional Officer and Bureau Officers (DL-02)."),
                ("24", "Annual Renewal & Good Standing", "Institution files renewed documents ➔ verified by RO ➔ continuous compliance.")
            ],
            0, 1
        ),
    ]

    # Draw each phase card
    card_positions = {}
    for p_id, p_lbl, p_title, p_role, r_color, bg_color, b_color, steps, col, row in phases:
        cx = start_x + col * (col_w + gap_x)
        cy = start_y + row * (row_h + gap_y)
        card_positions[p_id] = (cx, cy, col_w, row_h)

        # Card container with rounded corners and glassmorphic fill
        draw.rounded_rectangle([cx, cy, cx + col_w, cy + row_h], radius=20, fill=bg_color, outline=b_color, width=2)

        # Phase header banner inside card
        draw.rounded_rectangle([cx, cy, cx + col_w, cy + 95], radius=20, fill=(r_color[0]//4, r_color[1]//4, r_color[2]//4, 200))
        # Square off bottom of header banner
        draw.rectangle([cx, cy + 40, cx + col_w, cy + 95], fill=(r_color[0]//4, r_color[1]//4, r_color[2]//4, 200))
        draw.line([(cx, cy + 95), (cx + col_w, cy + 95)], fill=b_color, width=2)

        # Phase label + Title
        draw.text((cx + 25, cy + 18), p_lbl, font=f_phase_num, fill=r_color)
        draw.text((cx + 25, cy + 48), p_title, font=f_phase_title, fill=(255, 255, 255, 255))

        # Actor badge on right of header
        badge_text = p_role
        badge_box_w = 260
        draw.rounded_rectangle([cx + col_w - badge_box_w - 20, cy + 24, cx + col_w - 20, cy + 68], radius=14, fill=(0, 0, 0, 120), outline=r_color, width=1)
        draw.text((cx + col_w - badge_box_w - 5, cy + 34), badge_text, font=f_role, fill=r_color)

        # Draw steps inside phase card
        step_y = cy + 115
        step_gap = 130
        for s_idx, (s_num, s_title, s_desc) in enumerate(steps):
            sy = step_y + s_idx * step_gap
            
            # Step capsule / number badge
            draw.rounded_rectangle([cx + 24, sy, cx + 72, sy + 44], radius=10, fill=r_color, outline=None)
            draw.text((cx + 34, sy + 10), s_num, font=f_step_num, fill=(0, 0, 0, 255))

            # Step title
            draw.text((cx + 88, sy), s_title, font=f_step_title, fill=(240, 253, 244, 255))
            
            # Step description (multiline wrap if needed)
            words = s_desc.split(" ")
            line1, line2 = "", ""
            for word in words:
                test_line = line1 + " " + word if line1 else word
                if len(test_line) < 58:
                    line1 = test_line
                else:
                    line2 = line2 + " " + word if line2 else word

            draw.text((cx + 88, sy + 30), line1, font=f_step_desc, fill=(167, 185, 175, 255))
            if line2:
                draw.text((cx + 88, sy + 54), line2, font=f_step_desc, fill=(167, 185, 175, 255))

            # Subtle connecting dashed line between steps
            if s_idx < len(steps) - 1:
                draw.line([(cx + 48, sy + 48), (cx + 48, sy + step_gap - 8)], fill=(r_color[0]//2, r_color[1]//2, r_color[2]//2, 100), width=2)

    # 4. Connector Arrows between Phases
    # Arrow 1: Phase 1 -> Phase 2 (Right)
    p1 = card_positions[1]
    p2 = card_positions[2]
    ay1 = p1[1] + 48
    draw.line([(p1[0] + col_w + 10, ay1), (p2[0] - 15, ay1)], fill=(16, 185, 129, 255), width=4)
    draw.polygon([(p2[0] - 5, ay1), (p2[0] - 22, ay1 - 10), (p2[0] - 22, ay1 + 10)], fill=(16, 185, 129, 255))

    # Arrow 2: Phase 2 -> Phase 3 (Right)
    p3 = card_positions[3]
    ay2 = p2[1] + 48
    draw.line([(p2[0] + col_w + 10, ay2), (p3[0] - 15, ay2)], fill=(245, 158, 11, 255), width=4)
    draw.polygon([(p3[0] - 5, ay2), (p3[0] - 22, ay2 - 10), (p3[0] - 22, ay2 + 10)], fill=(245, 158, 11, 255))

    # Arrow 3: Phase 3 -> Phase 4 (Down)
    p4 = card_positions[4]
    ax3 = p3[0] + col_w // 2
    draw.line([(ax3, p3[1] + row_h + 10), (ax3, p4[1] - 15)], fill=(59, 130, 246, 255), width=4)
    draw.polygon([(ax3, p4[1] - 5), (ax3 - 10, p4[1] - 22), (ax3 + 10, p4[1] - 22)], fill=(59, 130, 246, 255))

    # Arrow 4: Phase 4 -> Phase 5 (Left)
    p5 = card_positions[5]
    ay4 = p4[1] + 48
    draw.line([(p4[0] - 10, ay4), (p5[0] + col_w + 15, ay4)], fill=(139, 92, 246, 255), width=4)
    draw.polygon([(p5[0] + col_w + 5, ay4), (p5[0] + col_w + 22, ay4 - 10), (p5[0] + col_w + 22, ay4 + 10)], fill=(139, 92, 246, 255))

    # Arrow 5: Phase 5 -> Phase 6 (Left)
    p6 = card_positions[6]
    ay5 = p5[1] + 48
    draw.line([(p5[0] - 10, ay5), (p6[0] + col_w + 15, ay5)], fill=(234, 179, 8, 255), width=4)
    draw.polygon([(p6[0] + col_w + 5, ay5), (p6[0] + col_w + 22, ay5 - 10), (p6[0] + col_w + 22, ay5 + 10)], fill=(234, 179, 8, 255))

    # Arrow 6: Loopback Arrow Phase 6 -> Phase 1 (Annual Re-Approval / Renewal Cycle)
    ax6 = p6[0] + col_w // 2
    draw.line([(ax6, p6[1] - 10), (ax6, p1[1] + row_h + 15)], fill=(6, 182, 212, 255), width=4)
    draw.polygon([(ax6, p1[1] + row_h + 5), (ax6 - 10, p1[1] + row_h + 22), (ax6 + 10, p1[1] + row_h + 22)], fill=(6, 182, 212, 255))
    # Loopback label
    draw.rounded_rectangle([ax6 - 140, p1[1] + row_h + 28, ax6 + 140, p1[1] + row_h + 58], radius=8, fill=(8, 28, 34, 240), outline=(6, 182, 212, 200), width=1)
    draw.text((ax6 - 128, p1[1] + row_h + 34), "↺ Annual Renewal & Expiry Cycle", font=f_step_num, fill=(6, 182, 212, 255))

    # 5. Footer Bar
    footer_y = H - 85
    draw.line([(100, footer_y), (W - 100, footer_y)], fill=(30, 70, 45, 255), width=2)
    
    draw.text((100, footer_y + 20), "🔒 AICTE Smart India Hackathon (SIH26262) | Non-Repudiation Audit Logs with Persistent Correlation Tokens (COR-XXXXXX)", font=f_legend, fill=(110, 140, 125, 255))
    draw.text((W - 740, footer_y + 20), "All 6 Statutory Desks Verified & Operational | Closed-Loop Prototype Architecture", font=f_legend, fill=(52, 211, 153, 255))

    # Save PNG in high quality
    out_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_path = os.path.join(out_dir, "end_to_end_regulatory_journey.png")
    img.save(out_path, "PNG", dpi=(300, 300))
    print(f"Generated PNG successfully at: {out_path}")

    # Optionally copy to artifact directory if set and accessible
    artifact_dir = os.environ.get("ARGUS_ARTIFACT_DIR")
    if artifact_dir and os.path.exists(artifact_dir):
        try:
            artifact_path = os.path.join(artifact_dir, "end_to_end_regulatory_journey.png")
            img.save(artifact_path, "PNG", dpi=(300, 300))
            print(f"Copied to artifact dir: {artifact_path}")
        except Exception as e:
            print(f"Skipped artifact copy: {e}")

if __name__ == "__main__":
    create_journey_diagram()
