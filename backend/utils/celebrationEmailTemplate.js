// backend/utils/celebrationEmailTemplate.js

const escapeHtml = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// "\n\n" => new paragraph, "\n" => line break
const formatBody = (text = '', fontSize = 15, color = '#334155', align = 'left') =>
  escapeHtml(text)
    .split(/\n\s*\n/)
    .map(
      (p) =>
        `<p style="margin:0 0 10px 0;font-size:${fontSize}px;line-height:1.6;color:${color};text-align:${align};">${p.replace(/\n/g, '<br>')}</p>`
    )
    .join('');

const ASSET_BASE = process.env.CELEB_ASSET_BASE_URL;

const GOLD = '#b8892b';
const GOLD_SOFT = '#d9bd7a';
const NAVY = '#1e2a4a';
const BROWN = '#4a3f35';
const SERIF = "Georgia,'Times New Roman',serif";

// Royal blue palette (work anniversary)
const ROYAL = '#1e3a8a';
const BLUE = '#2563eb';
const SKY = '#bfdbfe';
const INK = '#0f172a';
const SLATE = '#475569';

/* ------------------------------------------------------------------ */
/* BIRTHDAY                                                            */
/* ------------------------------------------------------------------ */

const birthdayTheme = {
  gradient: 'linear-gradient(135deg,#0ea5e9 0%,#6366f1 55%,#14b8a6 100%)',
  solid: '#6366f1',
  soft: '#eff6ff',
  border: '#bfdbfe',
  accent: '#1d4ed8',
  hero: '🎂',
  confetti: '🎈 🎉 🎁 🎊 🎈',
  title: 'Happy Birthday!',
};

// Plain fallback (used only when CELEB_ASSET_BASE_URL is not set)
const buildLayout = ({ theme, name, intro, bodyHtml, extraBlock, preheader }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:30px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.10);">
          <tr>
            <td align="center" style="background-color:${theme.solid};background-image:${theme.gradient};padding:40px 20px 34px 20px;">
              <div style="font-size:56px;line-height:1;">${theme.hero}</div>
              <div style="font-size:14px;letter-spacing:4px;color:#ffffff;margin-top:14px;opacity:0.95;">${theme.confetti}</div>
              <h1 style="margin:14px 0 0 0;font-size:30px;color:#ffffff;font-weight:700;">${theme.title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:34px 36px 10px 36px;">
              <p style="margin:0 0 16px 0;font-size:18px;color:#0f172a;">Dear <b>${escapeHtml(name)}</b>,</p>
              <p style="margin:0 0 22px 0;font-size:16px;font-weight:600;color:${theme.accent};">${intro}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:${theme.soft};border-left:4px solid ${theme.solid};border-radius:8px;padding:22px 24px;">
                    ${bodyHtml}
                  </td>
                </tr>
              </table>
              ${extraBlock || ''}
            </td>
          </tr>
          <tr>
            <td style="padding:10px 36px 34px 36px;">
              <p style="margin:0;font-size:15px;color:#475569;">Warm Regards,</p>
              <p style="margin:4px 0 0 0;font-size:16px;font-weight:700;color:#0f172a;">Praxsol Engineering Private Limited</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">💌 Sent with love from the Praxsol team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const buildBirthdayEmailOld = ({ name, message }) => {
  const t = birthdayTheme;
  const extraBlock = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;">
      <tr>
        <td align="center" style="border:2px dashed ${t.border};border-radius:12px;padding:18px;">
          <div style="font-size:26px;">🎁 🎈 🎂</div>
          <p style="margin:8px 0 0 0;font-size:14px;color:${t.accent};font-weight:600;">
            Today is all about YOU. Go enjoy every moment! 🥳
          </p>
        </td>
      </tr>
    </table>`;

  return buildLayout({
    theme: t,
    name,
    intro: 'Wishing you a very Happy Birthday from the entire Praxsol team! 🎉',
    bodyHtml: formatBody(message),
    extraBlock,
    preheader: `🎂 Happy Birthday ${name}! Wishing you a wonderful year ahead.`,
  });
};

// Gold line - star - gold line
const goldDivider = (lineW = 70, margin = '8px auto 10px auto') => `
<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:${margin};">
  <tr>
    <td valign="middle" width="${lineW}" style="width:${lineW}px;"><div style="height:1px;line-height:1px;font-size:1px;background:${GOLD_SOFT};">&nbsp;</div></td>
    <td valign="middle" style="padding:0 10px;color:${GOLD};font-size:12px;line-height:12px;">&#10022;</td>
    <td valign="middle" width="${lineW}" style="width:${lineW}px;"><div style="height:1px;line-height:1px;font-size:1px;background:${GOLD_SOFT};">&nbsp;</div></td>
  </tr>
</table>`;

const buildBgLayout = ({ bgUrl, bgColor = '#fff6e0', contentHtml, preheader,
  width = 700, height = 440, padTop = 34, padLeft = 125, padRight = 145, padBottom = 20 }) => `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;-webkit-text-size-adjust:none;text-size-adjust:none;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:16px 0;">
    <tr><td align="center">
      <table role="presentation" width="${width}" cellpadding="0" cellspacing="0" style="width:${width}px;min-width:${width}px;">
        <tr>
          <td background="${bgUrl}" bgcolor="${bgColor}" width="${width}" height="${height}" valign="top"
              style="width:${width}px;height:${height}px;background-color:${bgColor};background-image:url('${bgUrl}');background-size:${width}px ${height}px;background-position:center;background-repeat:no-repeat;">
            <!--[if gte mso 9]>
            <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:${width}px;height:${height}px;">
              <v:fill type="frame" src="${bgUrl}" color="${bgColor}" />
              <v:textbox inset="0,0,0,0">
            <![endif]-->
            <div style="height:${height}px;overflow:hidden;padding:${padTop}px ${padRight}px ${padBottom}px ${padLeft}px;text-align:center;box-sizing:border-box;">
              ${contentHtml}
            </div>
            <!--[if gte mso 9]></v:textbox></v:rect><![endif]-->
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const buildBirthdayEmail = ({ name, message }) => {
  if (!ASSET_BASE) return buildBirthdayEmailOld({ name, message });

  const text = String(message || '');
  // shrink font a little for long messages so nothing reaches the wave
  const bodySize = text.length > 300 ? 11 : text.length > 200 ? 12 : 13;

  const contentHtml = `
    <p style="margin:0;font-size:10px;letter-spacing:4px;color:${GOLD};font-weight:700;text-align:center;">PRAXSOL ENGINEERING</p>
    <h1 style="margin:4px 0 0 0;font-family:${SERIF};font-style:italic;font-size:32px;line-height:1.15;color:${NAVY};font-weight:700;text-align:center;">Happy Birthday</h1>
    ${goldDivider(60, '8px auto 10px auto')}
    <p style="margin:0 0 6px 0;font-size:15px;color:${NAVY};text-align:center;">Dear <b>${escapeHtml(name)}</b>,</p>
    ${formatBody(text, bodySize, BROWN, 'center')}
    <p style="margin:6px 0 0 0;font-size:11px;color:${GOLD};text-align:center;letter-spacing:1px;">WARM REGARDS</p>
    <p style="margin:2px 0 0 0;font-size:14px;font-weight:700;color:${NAVY};text-align:center;">Praxsol Engineering Private Limited</p>
  `;

  return buildBgLayout({
    bgUrl: `${ASSET_BASE}/birthday-bg.png`,
    bgColor: '#f5f9ff',
    contentHtml,
    preheader: `🎂 Happy Birthday ${name}!`,
    height: 440,
    padTop: 28,
    padLeft: 200,   // clear of the balloons, gifts and cake on the left
    padRight: 50,   // right side is empty
    padBottom: 70,  // clear of the wave at the bottom
  });
};

/* ------------------------------------------------------------------ */
/* WORK ANNIVERSARY  (royal white + blue, ~16:9 card)                  */
/* ------------------------------------------------------------------ */

const milestoneLabel = (n) => {
  const map = {
    1: 'One Year Strong',
    2: 'Two Years of Impact',
    3: 'Three Years of Excellence',
    4: 'Four Years of Growth',
    5: 'Five Years of Dedication',
    10: 'A Decade of Excellence',
  };
  return map[n] || `${n} Years of Dedication`;
};

const buildAnniversaryEmailPlain = ({ name, message, yearsCompleted }) => {  const years = Number(yearsCompleted) || 1;
  const label = milestoneLabel(years).toUpperCase();
  const yearWord = years === 1 ? 'YEAR' : 'YEARS';
  const preheader = `🥂 Happy Work Anniversary ${name}! ${years} ${years === 1 ? 'year' : 'years'} with Praxsol.`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:16px 8px;">
    <tr><td align="center">

      <table role="presentation" width="700" cellpadding="0" cellspacing="0"
             style="max-width:700px;width:100%;background:#ffffff;border:1px solid #dbeafe;border-radius:10px;overflow:hidden;">

        <!-- top bar -->
        <tr>
          <td align="center" bgcolor="${ROYAL}" style="background:${ROYAL};padding:14px 20px;">
            <p style="margin:0;font-size:11px;letter-spacing:5px;color:#ffffff;font-weight:700;">PRAXSOL ENGINEERING</p>
          </td>
        </tr>
        <tr><td height="3" bgcolor="${BLUE}" style="background:${BLUE};font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- hero: number block + title -->
        <tr>
          <td style="padding:24px 48px 0 48px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="170" align="center" valign="middle" bgcolor="${ROYAL}"
                    style="width:170px;background-color:${ROYAL};background-image:linear-gradient(160deg,${ROYAL},${BLUE});border-radius:12px;padding:16px 8px;">
                  <div style="font-family:${SERIF};font-size:84px;line-height:88px;font-weight:700;color:#ffffff;">${years}</div>
                  <div style="font-size:12px;letter-spacing:5px;color:${SKY};font-weight:700;margin-top:2px;">${yearWord}</div>
                </td>
                <td valign="middle" align="left" style="padding-left:28px;">
                  <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:3px;color:${BLUE};font-weight:700;">${escapeHtml(label)}</p>
                  <p style="margin:0;font-family:${SERIF};font-size:32px;line-height:38px;font-weight:700;color:${ROYAL};">Happy Work<br>Anniversary</p>
                  <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:12px;">
                    <tr><td width="44" height="3" bgcolor="${BLUE}" style="background:${BLUE};font-size:0;line-height:0;">&nbsp;</td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- message -->
        <tr>
          <td align="center" style="padding:22px 56px 0 56px;">
            <p style="margin:0 0 8px 0;font-size:16px;color:${INK};text-align:center;">Dear <b>${escapeHtml(name)}</b>,</p>
            ${formatBody(message, 13, SLATE, 'center')}
          </td>
        </tr>

        <!-- signature -->
        <tr>
          <td align="center" style="padding:8px 36px 22px 36px;">
            <p style="margin:0;font-size:12px;letter-spacing:2px;color:${BLUE};">WARM REGARDS</p>
            <p style="margin:3px 0 0 0;font-size:15px;font-weight:700;color:${ROYAL};">Praxsol Engineering Private Limited</p>
          </td>
        </tr>

        <!-- bottom bar -->
        <tr><td height="6" bgcolor="${ROYAL}" style="background:${ROYAL};font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>

    </td></tr>
  </table>
</body>
</html>`;
};


const buildAnniversaryEmail = ({ name, message, yearsCompleted }) => {
  if (!ASSET_BASE) return buildAnniversaryEmailPlain({ name, message, yearsCompleted });

  const years = Number(yearsCompleted) || 1;
  const label = milestoneLabel(years).toUpperCase();
  const yearWord = years === 1 ? 'YEAR' : 'YEARS';
  const numSize = years >= 10 ? 76 : 92;
  const text = String(message || '');
  // shrink the font a little if the message is long, so it never reaches the bottom wave
  const bodySize = text.length > 300 ? 11 : text.length > 200 ? 12 : 13;

  const contentHtml = `
    <p style="margin:0;font-size:11px;letter-spacing:5px;color:${ROYAL};font-weight:700;text-align:center;">PRAXSOL ENGINEERING</p>

    <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:12px auto 0 auto;">
      <tr>
        <td align="center" valign="middle" style="padding:0 26px 0 0;border-right:1px solid ${SKY};">
          <div style="font-family:${SERIF};font-size:${numSize}px;line-height:${numSize}px;font-weight:700;color:${ROYAL};">${years}</div>
          <div style="font-size:12px;letter-spacing:5px;color:${BLUE};font-weight:700;margin-top:4px;">${yearWord}</div>
        </td>
        <td align="left" valign="middle" style="padding-left:26px;">
          <p style="margin:0 0 6px 0;font-size:10px;letter-spacing:3px;color:${BLUE};font-weight:700;">${escapeHtml(label)}</p>
          <p style="margin:0;font-family:${SERIF};font-size:30px;line-height:36px;font-weight:700;color:${ROYAL};">Happy Work<br>Anniversary</p>
        </td>
      </tr>
    </table>

    <p style="margin:14px 0 6px 0;font-size:15px;color:${INK};text-align:center;">Dear <b>${escapeHtml(name)}</b>,</p>
    ${formatBody(text, bodySize, SLATE, 'center')}
    <p style="margin:6px 0 0 0;font-size:11px;letter-spacing:2px;color:${BLUE};text-align:center;">WARM REGARDS</p>
    <p style="margin:2px 0 0 0;font-size:14px;font-weight:700;color:${ROYAL};text-align:center;">Praxsol Engineering Private Limited</p>
  `;

  return buildBgLayout({
    bgUrl: `${ASSET_BASE}/anniversary-bg.png`,
    bgColor: '#f3f8ff',
    contentHtml,
    preheader: `🥂 Happy Work Anniversary ${name}! ${years} ${years === 1 ? 'year' : 'years'} with Praxsol.`,
    width: 700,
    height: 394,      // 16:9
    padTop: 24,
    padLeft: 70,
    padRight: 70,
    padBottom: 54,    // keeps text clear of the navy wave at the bottom
  });
};

module.exports = { buildBirthdayEmail, buildAnniversaryEmail };