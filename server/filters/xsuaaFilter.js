/**
 * xsuaaFilter.js returns a new instance of "passport", including an XSUAA related JWTStrategy 
 *  
 * The Bearer strategy ensures, that only requests which can be authenticated by the XSUAA binding
 * are processed by the backend. This is required to protect the notification endpoint of the 
 * extension application. SAP Cloud Integration which is sending requests to this endpoint, has 
 * the Client Credentials of this XSUAA instance configured so only these calls are processed. Other
 * calls from the public internet will not be granted access by this JWTStrategy. 
 */

import { Passport} from 'passport'
import { JWTStrategy } from '@sap/xssec';
import * as xsenv from '@sap/xsenv';

class XsuaaFilter {
    passport;

    constructor(passport) {
        this.passport = passport;
    }

    auth = () => { 
        return this.passport.authenticate('JWT', { session: false })
    }
}

let xsuaaPassport = new Passport();
xsuaaPassport.use(new JWTStrategy(xsenv.getServices({uaa:{tag:'xsuaa'}}).uaa));
xsuaaPassport.initialize()
const xsuaaFilter = new XsuaaFilter(xsuaaPassport)

export { xsuaaFilter }