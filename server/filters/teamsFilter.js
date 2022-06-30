/**
 * teamsFilter.js returns a new instance of "passport", including an Azure related Bearer strategy
 *  
 * The Bearer strategy ensures, that only requests by valid users of a certain Azure Active Directory
 * are being processed. This is relevant for the client application, to make sure the backend is only
 * processing calls by valid AD users and not being overloaded by unauthenticated request from the internet
 */

import { Passport } from 'passport'
import { BearerStrategy } from "passport-azure-ad";

class TeamsFilter {
    passport;

    constructor(passport) {
        this.passport = passport;
    }

    auth = () => { return this.passport.authenticate("oauth-bearer", { session: false }) }
}

// Bearer Strategy options validating a request against the configured Azure AD
const options = {
    identityMetadata: `https://login.microsoftonline.com/${process.env.MICROSOFT_AD_TENANT_ID}/v2.0/.well-known/openid-configuration`,
    clientID: process.env.MICROSOFT_APP_ID || "",
    loggingLevel: "warn",
    validateIssuer: true
}

const callback = (token, done) => { done(null, { tid: token.tid, name: token.name, upn: token.upn }, token) }

// Set up the Bearer Strategy
const bearerStrategy = new BearerStrategy(options, callback);
const teamsPassport = new Passport();

teamsPassport.initialize();
teamsPassport.use(bearerStrategy);

const teamsFilter = new TeamsFilter(teamsPassport)

export { teamsFilter }