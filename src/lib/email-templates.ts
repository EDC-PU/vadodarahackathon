
interface EmailTemplateProps {
  title: string;
  body: string; // This will be the main HTML content of the email
  buttonLink: string;
  buttonText: string;
}

export function getEmailTemplate({ title, body, buttonLink, buttonText }: EmailTemplateProps): string {
  const brandYellow = '#FFD700';
  const brandOrange = '#FF8C00';
  const brandRed = '#FF4500';
  const bgColor = '#121212';
  const cardColor = '#1E1E1E';
  const textColor = '#E0E0E0';
  const mutedColor = '#A0A0A0';

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
                border-top: 1px solid #333;
                text-align: center;
                font-size: 12px;
                color: ${mutedColor};
            }
            .credentials {
                background-color: #2a2a2a;
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
