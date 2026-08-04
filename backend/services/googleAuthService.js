const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Verifies a Google ID token (the `credential` from Google Identity Services)
// and returns the normalized profile fields we care about.
async function verifyGoogleToken(credential) {
    const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
        throw new Error('Invalid Google token payload');
    }

    return {
        googleId: payload.sub,
        email: payload.email,
        emailVerified: !!payload.email_verified,
        fullName: payload.name || payload.email.split('@')[0],
        avatarUrl: payload.picture
    };
}

module.exports = { verifyGoogleToken };
