// backend/utils/celebrationEmailTemplate.js

const escapeHtml = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// "\n\n" => new paragraph, "\n" => line break
const formatBody = (text = '') =>
  escapeHtml(text)
    .split(/\n\s*\n/)
    .map(
      (p) =>
        `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#334155;">${p.replace(/\n/g, '<br>')}</p>`
    )
    .join('');

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const themes = {
  birthday: {
    gradient: 'linear-gradient(135deg,#0ea5e9 0%,#6366f1 55%,#14b8a6 100%)',
    solid: '#6366f1',
    soft: '#eff6ff',
    border: '#bfdbfe',
    accent: '#1d4ed8',
    hero: '🎂',
    confetti: '🎈 🎉 🎁 🎊 🎈',
    title: 'Happy Birthday!',
  },
  anniversary: {
    gradient: 'linear-gradient(135deg,#0ea5e9 0%,#6366f1 55%,#14b8a6 100%)',
    solid: '#6366f1',
    soft: '#eff6ff',
    border: '#bfdbfe',
    accent: '#1d4ed8',
    hero: '🥂',
    confetti: '🎉 ✨ 🏆 ✨ 🎉',
    title: 'Happy Work Anniversary!',
  },
};

const buildLayout = ({ theme, name, intro, bodyHtml, extraBlock, badgeHtml, preheader }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  <!-- hidden preheader (inbox preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:30px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.10);">

          <!-- HEADER -->
          <tr>
            <td align="center" style="background-color:${theme.solid};background-image:${theme.gradient};padding:40px 20px 34px 20px;">
              <div style="font-size:56px;line-height:1;">${theme.hero}</div>
              <div style="font-size:14px;letter-spacing:4px;color:#ffffff;margin-top:14px;opacity:0.95;">${theme.confetti}</div>
              <h1 style="margin:14px 0 0 0;font-size:30px;color:#ffffff;font-weight:700;">${theme.title}</h1>
              ${badgeHtml || ''}
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:34px 36px 10px 36px;">
              <p style="margin:0 0 16px 0;font-size:18px;color:#0f172a;">Dear <b>${escapeHtml(name)}</b>,</p>
              <p style="margin:0 0 22px 0;font-size:16px;font-weight:600;color:${theme.accent};">${intro}</p>

              <!-- Editable message (from Wishflow page) -->
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

          <!-- SIGNATURE -->
          <tr>
            <td style="padding:10px 36px 34px 36px;">
              <p style="margin:0;font-size:15px;color:#475569;">Warm Regards,</p>
              <p style="margin:4px 0 0 0;font-size:16px;font-weight:700;color:#0f172a;">Praxsol Engineering Private Limited</p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                💌 Sent with love from the Praxsol team
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const buildBirthdayEmail = ({ name, message }) => {
  const t = themes.birthday;
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

const buildAnniversaryEmail = ({ name, message, yearsCompleted }) => {
  const t = themes.anniversary;
  const badgeHtml = yearsCompleted
    ? `<div style="display:inline-block;margin-top:16px;background:#ffffff;color:${t.accent};font-weight:700;font-size:14px;padding:8px 20px;border-radius:999px;">
         🏆 ${ordinal(yearsCompleted)} Work Anniversary
       </div>`
    : '';
  const extraBlock = yearsCompleted
    ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;">
      <tr>
        <td align="center" style="border:2px dashed ${t.border};border-radius:12px;padding:18px;">
          <div style="font-size:40px;font-weight:800;color:${t.solid};line-height:1;">${yearsCompleted}</div>
          <div style="font-size:13px;letter-spacing:2px;color:#64748b;margin-top:4px;">
            ${yearsCompleted === 1 ? 'YEAR' : 'YEARS'} OF GREAT WORK ✨
          </div>
        </td>
      </tr>
    </table>`
    : '';

  return buildLayout({
    theme: t,
    name,
    intro: 'Another year, another milestone! 🥂<br>Happy Work Anniversary at Praxsol Engineering',
    bodyHtml: formatBody(message),
    extraBlock,
    badgeHtml,
    preheader: `🥂 Happy Work Anniversary ${name}! Thank you for being part of our journey.`,
  });
};

module.exports = { buildBirthdayEmail, buildAnniversaryEmail };