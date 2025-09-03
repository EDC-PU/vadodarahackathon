

interface EmailTemplateProps {
    title: string;
    body: string; // This will be the main HTML content of the email
    buttonLink: string;
    buttonText: string;
    theme?: 'dark' | 'light';
  }
  
  function getContrastColor(hex: string): string {
    // Remove "#" if present
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
  
    // Calculate relative luminance (per WCAG)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
    // Return black for light backgrounds, white for dark
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  }
  
  export function getEmailTemplate({ title, body, buttonLink, buttonText, theme = 'dark' }: EmailTemplateProps): string {
    const isLightTheme = theme === 'light';

    // Theme colors
    const brandYellow = '#FFD700';
    const brandOrange = '#FF8C00';
    const brandRed = '#FF4500';

    const bgColor = isLightTheme ? '#F8F9FA' : '#121212';
    const cardColor = isLightTheme ? '#FFFFFF' : '#1E1E1E';
    const textColor = isLightTheme ? '#212529' : '#FFFFFF';
    const mutedColor = isLightTheme ? '#6C757D' : '#A0A0A0';
    const borderColor = isLightTheme ? '#DEE2E6' : '#333333';
  
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
          <style>
              body {
                  margin: 0;
                  padding: 0;
                  background-color: ${bgColor};
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
                  color: ${textColor};
              }
              .container {
                  width: 100%;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
              }
              .header {
                  text-align: center;
                  padding-bottom: 20px;
                  border-bottom: 1px solid ${brandOrange};
              }
              .header img {
                  max-width: 200px;
              }
              .content {
                  padding: 30px 0;
                  font-size: 16px;
                  line-height: 1.6;
              }
              .content p {
                  margin: 0 0 1em 0;
              }
              .content a {
                  color: ${brandOrange};
                  text-decoration: none;
              }
              .button-container {
                  text-align: center;
                  padding: 20px 0;
              }
              .button {
                  display: inline-block;
                  padding: 12px 24px;
                  background-image: linear-gradient(to right, ${brandYellow} 0%, ${brandOrange} 50%, ${brandRed} 100%);
                  background-size: 200% auto;
                  color: #000000;
                  text-align: center;
                  text-decoration: none;
                  font-weight: bold;
                  border-radius: 25px;
                  transition: background-position 0.5s;
              }
              .button:hover {
                  background-position: right center;
              }
              .footer {
                  padding-top: 20px;
                  border-top: 1px solid ${borderColor};
                  text-align: center;
                  font-size: 12px;
                  color: ${mutedColor};
              }
              .credentials {
                  background-color: ${isLightTheme ? '#F1F3F5' : '#2a2a2a'};
                  border-left: 4px solid ${brandOrange};
                  padding: 15px;
                  margin: 20px 0;
                  border-radius: 4px;
                  font-family: 'Courier New', Courier, monospace;
              }
              .credentials p {
                  margin: 5px 0;
              }
          </style>
      </head>
      <body>
          <div class="container" style="background-color: ${cardColor}; border-radius: 8px; margin-top: 20px; margin-bottom: 20px;">
              <div class="header">
                  <img src="https://www.pierc.org/vhlogo.png" alt="Vadodara Hackathon 6.0 Logo">
              </div>
              <div class="content">
                  <h1 style="color: ${brandOrange};">${title}</h1>
                  ${body}
                  <div class="button-container">
                      <a href="${buttonLink}" class="button">${buttonText}</a>
                  </div>
              </div>
              <div class="footer">
                  <p>&copy; ${new Date().getFullYear()} Vadodara Hackathon | Parul University</p>
                  <p>This is an automated email. Please do not reply.</p>
              </div>
          </div>
      </body>
      </html>
    `;
  }
  
  export function sendMemberLeftEmail(leaderName: string, memberName: string, teamName: string): string {
    return getEmailTemplate({
        title: 'A Member Has Left Your Team',
        body: `
            <p>Hi ${leaderName},</p>
            <p>This is an automated notification to inform you that <strong>${memberName}</strong> is no longer a member of your team, <strong>${teamName}</strong>.</p>
            <p>Their account has been deleted from the portal. Your team now has an open spot for a new member.</p>
        `,
        buttonLink: 'https://vadodarahackathon.pierc.org/leader',
        buttonText: 'Go to Your Dashboard'
    });
}

export async function getTeamRegistrationCompleteEmail(leaderEmail: string, leaderName: string, teamName: string): Promise<void> {
  const whatsappChannelLink = "https://www.whatsapp.com/channel/0029Vb6DOYXHltYBt7wNJu1D";
  
  const emailHtml = getEmailTemplate({
      title: 'Congratulations! Your Team Registration is Complete!',
      body: `
          <p>Hi ${leaderName},</p>
          <p>Fantastic news! Your team, <strong>${teamName}</strong>, has successfully completed its registration for Vadodara Hackathon 6.0.</p>
          <p><strong>Next Step:</strong> To receive all important updates, announcements, and direct communication from the organizers, it is mandatory for you and all your team members to join our official WhatsApp channel.</p>
          <p>Please share the following link with all your team members and ensure they join immediately:</p>
          <div class="credentials">
            <p><strong>WhatsApp Channel:</strong> <a href="${whatsappChannelLink}" target="_blank">${whatsappChannelLink}</a></p>
          </div>
          <p>We're excited to see what your team creates. Good luck!</p>
      `,
      buttonLink: whatsappChannelLink,
      buttonText: 'Join WhatsApp Channel'
  });

  if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_PASSWORD) {
      console.error("GMAIL_EMAIL or GMAIL_PASSWORD environment variables not set for sending completion email.");
      throw new Error("Missing email server configuration.");
  }
  
  const nodemailer = (await import('nodemailer')).default;
  const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
          user: process.env.GMAIL_EMAIL,
          pass: process.env.GMAIL_PASSWORD,
      },
  });

  const mailOptions = {
      from: `"Vadodara Hackathon 6.0" <${process.env.GMAIL_EMAIL}>`,
      to: leaderEmail,
      subject: `✅ Your Team ${teamName} is Registered for Vadodara Hackathon 6.0!`,
      html: emailHtml,
  };

  await transporter.sendMail(mailOptions);
  console.log(`Successfully sent team registration completion email to ${leaderEmail}.`);
}
