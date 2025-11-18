import { APIError, ErrCode } from 'encore.dev/api';
import nodemailer from 'nodemailer';
import type { MainModel } from '../../../models/main-model';
import { CommonStatus, EmailSubject } from '../../../utils/enums';

const emailService = {
	transporter: nodemailer.createTransport({
		service: 'gmail',
		auth: {
			user: process.env.NODEMAILER_USER,
			pass: process.env.NODEMAILER_PASS,
		},
	}),
	async sendEmail(to: string, subject: string, html: string) {
		const mailOptions = {
			from: `Blogaer.com's dev Anekra <${process.env.NODEMAILER_USER}>`,
			to,
			subject,
			html,
		};
		const info = await this.transporter.sendMail(mailOptions);

		return info;
	},
	async handleEmailReqForm(
		subject: EmailSubject,
		userId: string,
		refreshToken: string,
		model: MainModel,
		origin?: string,
	) {
		if (!origin) {
			console.log('emailService.ts', 'Invalid request origin!');
			throw new CustomError(400, {
				status: ErrCode.Internal,
				error: 'Invalid request origin!',
			});
		}

		const user = await model.user.findByPk(userId, {
			attributes: ['id', 'email', 'username'],
		});
		if (!user?.id) {
			console.warn('HANDLE EMAIL SUBJECT email-controller >> User not found!');
			throw new APIError(ErrCode.NotFound, 'User not found!');
		}

		const token = await model.token.findByPk(refreshToken, {
			attributes: ['clientId'],
		});
		if (!token?.clientId) {
			console.warn(
				'HANDLE EMAIL SUBJECT email-controller >> No client id found!',
			);

			throw new APIError(ErrCode.NotFound, 'No client id found!');
		}

		const url = new URL(`${origin}/request-form/security/${subject}`);
		url.searchParams.set('username', `${user.username}`);
		const timeLimit = new Date();
		if (
			subject === EmailSubject.AddPassword ||
			subject === EmailSubject.ResetPassword
		) {
			timeLimit.setMinutes(timeLimit.getMinutes() + 30);
		} else {
			timeLimit.setHours(timeLimit.getHours() + 24);
		}
		url.searchParams.set('limit', `${timeLimit.getTime()}`);

		await model.userRequest.create({
			userId: user.id,
			clientId: token?.clientId,
			request: subject,
			limit: timeLimit,
			status: CommonStatus.Pending,
		});

		let html = '';
		switch (subject) {
			case EmailSubject.AddPassword:
				html = this.createLinkHtml(url.href, EmailSubject.AddPassword);
				break;
			case EmailSubject.ResetPassword:
				html = this.createLinkHtml(url.href, EmailSubject.ResetPassword);
				break;
			case EmailSubject.UpdateUsername:
				html = this.createLinkHtml(url.href, EmailSubject.UpdateUsername);
				break;
			case EmailSubject.UpdateEmail:
				html = this.createLinkHtml(url.href, EmailSubject.UpdateEmail);
				break;
			default:
				html = '';
		}

		return { email: user.email, limit: timeLimit.getTime(), html };
	},
	createLinkHtml(link: string, subject: EmailSubject) {
		let html = '';
		switch (subject) {
			case EmailSubject.AddPassword:
				html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Add Password</title><style> * { margin: 0 auto; padding: 0; } button { background-color: rgb(196, 108, 50); color: rgb(66, 12, 0); font-size: large; font-weight: bolder; border: none; padding: 16px 24px; border-radius: 10px; cursor: pointer; } .logo { max-height: 60px; padding-bottom: 4px; } .icon { max-height: 240px; } .container-wrapper { min-height: 100vh; background-image: url('https://i.imgur.com/x5V8Wfe.png'); background-color: rgb(139, 57, 34); color: black; padding: 16px 48px 16px 48px; text-align: center; } .container { background-color: rgb(231, 207, 192); color: black; border-radius: 24px; padding: 24px; } .wrapper { max-width: 600px; padding: 0 24px; } .wrapper p { text-align: justify; margin: 12px 0; } .copyright { color: rgb(231, 207, 192); margin-top: 16px; }</style></head><body class="container-wrapper"><table align="center"><thead><tr><td><img src="https://i.imgur.com/zZIeImG.png" alt="Logo" class="logo" /></td></tr></thead><tbody><tr><td class="container"><table><thead><tr><td><img src="https://i.imgur.com/V4PoPfC.png" alt="Icon" class="icon" /></td></tr></thead><tbody><tr><td><table class="wrapper"><thead><tr><td><h1>Add New Password</h1></td></tr></thead><tbody><tr><td><p>To add a new password to your account, simply click the link below. You'll be redirected to a new page where you can create a new password.</p></td></tr><tr><td><a href="${link}" target="_blank"><button>Add password</button></a></td></tr><tr><td><p>If did not request this action, you can ignore this email.</p></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td><p class="copyright">© 2025 Blogaer. All Rights Reserved.</p></td></tr></tbody></table></body></html>`;
				break;
			case EmailSubject.ResetPassword:
				html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Reset Password</title><style> * { margin: 0 auto; padding: 0; } button { background-color: rgb(196, 108, 50); color: rgb(66, 12, 0); font-size: large; font-weight: bolder; border: none; padding: 16px 24px; border-radius: 10px; cursor: pointer; } .logo { max-height: 60px; padding-bottom: 4px; } .icon { max-height: 240px; } .container-wrapper { min-height: 100vh; background-image: url('https://i.imgur.com/x5V8Wfe.png'); background-color: rgb(139, 57, 34); color: black; padding: 16px 48px 16px 48px; text-align: center; } .container { background-color: rgb(231, 207, 192); color: black; border-radius: 24px; padding: 24px; } .wrapper { max-width: 600px; padding: 0 24px; } .wrapper p { text-align: justify; margin: 12px 0; } .copyright { color: rgb(231, 207, 192); margin-top: 16px; }</style></head><body class="container-wrapper"><table align="center"><thead><tr><td><img src="https://i.imgur.com/zZIeImG.png" alt="Logo" class="logo" /></td></tr></thead><tbody><tr><td class="container"><table><thead><tr><td><img src="https://i.imgur.com/zZIeImG.png" alt="Icon" class="icon" /></td></tr></thead><tbody><tr><td><table class="wrapper"><thead><tr><td><h1>Forgot Your Password?</h1></td></tr></thead><tbody><tr><td><p>Seems like you forgot your password. To reset your password, simply click the link below. You'll be redirected to a new page where you can reset your forgotten password.</p></td></tr><tr><td><a href="${link}" target="_blank"><button>Reset password</button></a></td></tr><tr><td><p>If you did not forgot your password, you can ignore this email.</p></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td><p class="copyright">© 2025 Blogaer. All Rights Reserved.</p></td></tr></tbody></table></body></html>`;
				break;
			case EmailSubject.UpdateEmail:
				html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Update Email</title><style> * { margin: 0 auto; padding: 0; } button { background-color: rgb(196, 108, 50); color: rgb(66, 12, 0); font-size: large; font-weight: bolder; border: none; padding: 16px 24px; border-radius: 10px; cursor: pointer; } .logo { max-height: 60px; padding-bottom: 4px; } .icon { max-height: 240px; } .container-wrapper { min-height: 100vh; background-image: url('https://i.imgur.com/x5V8Wfe.png'); background-color: rgb(139, 57, 34); color: black; padding: 16px 48px 16px 48px; text-align: center; } .container { background-color: rgb(231, 207, 192); color: black; border-radius: 24px; padding: 24px; } .wrapper { max-width: 600px; padding: 0 24px; } .wrapper p { text-align: justify; margin: 12px 0; } .copyright { color: rgb(231, 207, 192); margin-top: 16px; }</style></head><body class="container-wrapper"><table align="center"><thead><tr><td><img src="https://i.imgur.com/zZIeImG.png" alt="Logo" class="logo" /></td></tr></thead><tbody><tr><td class="container"><table><thead><tr><td><img src="https://i.imgur.com/GZaEeq9.png" alt="email" class="icon" /></td></tr></thead><tbody><tr><td><table class="wrapper"><thead><tr><td><h1>Change Email</h1></td></tr></thead><tbody><tr><td><p> To change your account email, simply click the link below. You'll be redirected to a new page where you can change your email.</p></td></tr><tr><td><a href="${link}" target="_blank" ><button>Change my email</button></a ></td></tr><tr><td><p> If you did not request this action, you can ignore this email.</p></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td><p class="copyright">© 2025 Blogaer. All Rights Reserved.</p></td></tr></tbody></table></body></html>`;
				break;
			case EmailSubject.UpdateUsername:
				html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Update Username</title><style> * { margin: 0 auto; padding: 0; } button { background-color: rgb(196, 108, 50); color: rgb(66, 12, 0); font-size: large; font-weight: bolder; border: none; padding: 16px 24px; border-radius: 10px; cursor: pointer; } .logo { max-height: 60px; padding-bottom: 4px; } .icon { max-height: 240px; } .container-wrapper { min-height: 100vh; background-image: url('https://i.imgur.com/x5V8Wfe.png'); background-color: rgb(139, 57, 34); color: black; padding: 16px 48px 16px 48px; text-align: center; } .container { background-color: rgb(231, 207, 192); color: black; border-radius: 24px; padding: 24px; } .wrapper { max-width: 600px; padding: 0 24px; } .wrapper p { text-align: justify; margin: 12px 0; } .copyright { color: rgb(231, 207, 192); margin-top: 16px; }</style></head><body class="container-wrapper"><table align="center"><thead><tr><td><img src="https://i.imgur.com/zZIeImG.png" alt="Logo" class="logo" /></td></tr></thead><tbody><tr><td class="container"><table><thead><tr><td><img src="https://i.imgur.com/Zq9gLYq.png" class="icon" /></td></tr></thead><tbody><tr><td><table class="wrapper"><thead><tr><td><h1>Change Username</h1></td></tr></thead><tbody><tr><td><p> To change your account username, simply click the link below. You'll be redirected to a new page where you can change your username.</p></td></tr><tr><td><a href="${link}" target="_blank" ><button>Change username</button></a ></td></tr><tr><td><p> If you did not request this action, you can ignore this email.</p></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td><p class="copyright">© 2025 Blogaer. All Rights Reserved.</p></td></tr></tbody></table></body></html>`;
				break;
			case EmailSubject.VerifyEmail:
				html = `<!DOCTYPE html> <html lang="en"> <head> <meta charset="UTF-8" /> <meta name="viewport" content="width=device-width, initial-scale=1.0" /> <title>Confirm Email</title> <style> * { margin: 0 auto; padding: 0; } a { background-color: rgb(196, 108, 50); color: rgb(66, 12, 0); font-size: large; font-weight: bolder; text-decoration: none; border: none; padding: 16px 24px; border-radius: 10px; cursor: pointer; } .logo { background-image: url('https://i.imgur.com/vAvmoSm.png'); background-repeat: no-repeat; background-size: cover; max-height: 60px; width: 60px; height: 60px; padding-bottom: 4px; } .icon { background-image: url('https://i.imgur.com/vAvmoSm.png'); background-repeat: no-repeat; background-size: cover; max-height: 240px; width: 240px; height: 240px; } .container-wrapper { min-height: 100vh; background-image: url('https://i.imgur.com/x5V8Wfe.png'); background-color: rgb(139, 57, 34); color: black; padding: 16px 48px; text-align: center; } .container { background-color: rgb(231, 207, 192); color: black; border-radius: 24px; padding: 24px; } .wrapper { max-width: 600px; padding: 0 24px; } .wrapper p { text-align: justify; margin: 12px 0; padding: 0 24px 12px; } .copyright { color: rgb(231, 207, 192); margin-top: 16px; } </style> </head> <body class="container-wrapper"> <table align="center"> <thead> <tr> <td> <div class="logo"></div> </td> </tr> </thead> <tbody> <tr> <td class="container"> <table> <thead> <tr> <td> <div class="icon"></div> </td> </tr> </thead> <tbody> <tr> <td> <table class="wrapper"> <thead> <tr> <td> <h1>Verify Email</h1> </td> </tr> </thead> <tbody> <tr> <td> <p> To complete you registration precess please click this button confirm you email address!</p> </td> </tr> <tr> <td> <a href="${link}" target="_blank" style="cursor: pointer; color: rgb(66, 12, 0);"> Verify email </a> </td> </tr> </tbody> </table> </td> </tr> </tbody> </table> </td> </tr> <tr> <td> <p class="copyright">© 2025 Blogaer. All Rights Reserved.</p> </td> </tr> </tbody> </table> </body> </html>`;
				break;
			default:
				html = '';
		}

		return html;
	},
	createOtpHtml(otp: string) {
		const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Update Email</title><style> * { margin: 0 auto; padding: 0; } p { font-family: Arial, Helvetica, sans-serif; } .container-wrapper { min-height: 100vh; background-image: url('https://i.imgur.com/x5V8Wfe.png'); background-color: rgb(139, 57, 34); color: black; padding: 16px 48px 16px 48px; text-align: center; } .container { background-color: rgb(231, 207, 192); color: black; border-radius: 24px; padding: 24px; } .wrapper { max-width: 600px; padding: 0 24px; } .wrapper p { text-align: justify; margin: 12px 0; } .logo { max-height: 60px; padding-bottom: 4px; } .icon { max-height: 240px; } .otp-wrapper { font-size: 60px; text-align: center; background-color: white; border-radius: 10px; padding: 4px 20px; width: fit-content; } .otp-wrapper > * { display: inline; } .copyright { color: rgb(231, 207, 192); margin-top: 16px; } </style></head><body class="container-wrapper"><table align="center"><thead><tr><td><img src="https://i.imgur.com/zZIeImG.png" alt="Logo" class="logo" /></td></tr></thead><tbody><tr><td class="container"><table><thead><tr><td><img src="https://i.imgur.com/ZUrfria.png" alt="email" class="icon" /></td></tr></thead><tbody><tr><td><table class="wrapper"><thead><tr><td><h1>Change Email Verification Code</h1></td></tr></thead><tbody><tr><td><p> To complete your change email process enter this OTP code below in the "Change Email Form" to verify your new email address. The OTP code is valid for <b>5 minutes.</b></p></td></tr><tr><td><div class="otp-wrapper"><p>${otp}</p></div></td></tr><tr><td><p> If you did not request this action, you can ignore this email. </p></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td><p class="copyright">© 2025 Blogaer. All Rights Reserved.</p></td></tr></tbody></table></body></html>`;

		return html;
	},
};

export default emailService;
