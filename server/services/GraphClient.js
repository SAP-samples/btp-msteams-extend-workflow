/**
 * GraphClient.js provides a class offering features for retrieving Microsoft Graph data
 * 
 * This class provides calls to the Microsoft Graph API, like requesting a user's profile or photo. 
 * Authentication itself is not handled in this class but makes use of the AuthClient.js
 * 
 */

import { Client } from '@microsoft/microsoft-graph-client';
import "isomorphic-fetch";
import axios from 'axios';


class GraphClient {
    constructor(token) {
        if (!token || !token.trim()) {
            throw new Error('GraphClient: Invalid token received.');
        }

        this._token = token;

        // Get an Authenticated Microsoft Graph client using the token issued to the user.
        this.graphClient = Client.init({
            authProvider: (done) => {
                done(null, this._token); // First parameter takes an error if you can't get an access token.
            }
        });
    }

    
    // Get current user's profile
    async getProfile() {
        try {
            return await this.graphClient.api('/me').get();
        } catch (error) {
            return {};
        }
    }

    // Gets current user's photo
    async getPhoto() {
        const graphPhotoEndpoint = 'https://graph.microsoft.com/v1.0/me/photo/$value';
        const graphRequestParams = {
            method: 'GET',
            headers: {
                'Content-Type': 'image/png',
                authorization: 'bearer ' + this._token
            }
        };

        const response = await fetch(graphPhotoEndpoint, graphRequestParams).catch(this.unhandledFetchError);

        if (!response || !response.ok) {
            console.error('User Image Not Found!!');
            // Return a Sample Image
            return 'https://adaptivecards.io/content/cats/1.png';
        }
        const imageBuffer = await response.arrayBuffer().catch(this.unhandledFetchError); // Get image data as raw binary data
        
        // Convert binary data to an image URL and set the url in state
        const imageUri = 'data:image/png;base64,' + Buffer.from(imageBuffer).toString('base64');
        return imageUri;
    }
    

    // Get profile details of an Azure AD user via userId (email or graph user id)
    async getUserProfile(userId) {
        return new Promise(async (resolve, reject) => {
            await axios.get('https://graph.microsoft.com/v1.0/users/' + userId, {
                headers: {
                    'Content-type': 'application/json',
                    'Authorization': 'bearer ' + this._token
                }
            }).then((response) => {
                    resolve({
                        teamsId: response.data.id,
                        fullName: response.data.displayName,
                        mail: response.data.mail,
                        title: response.data.jobTitle
                    });
                })
                .catch((error) => {
                    if (error.response.status == 404) {
                        resolve(null);
                    } else {
                        reject(error);
                    }
                });
        });
    }

    // Get photo of an Azure AD user via userId (email or graph user id)
    async getUserPhoto(userId) {
        const graphPhotoEndpoint = `https://graph.microsoft.com/v1.0/users/${userId}/photos/48x48/$value`;
        
        const graphRequestParams = {
            method: 'GET',
            headers: {
                'Content-Type': 'image/jpeg',
                authorization: 'bearer ' + this._token
            }
        };

        const response = await fetch(graphPhotoEndpoint, graphRequestParams).catch(this.unhandledFetchError);

        if (!response || !response.ok) {
            console.error('User Image Not Found!!');
            // Return a Sample Image
            return '';
        }
        
        // Get image data as raw binary data
        const imageBuffer = await response.arrayBuffer().catch(this.unhandledFetchError);
        
        // Convert binary data to an image URL and set the url in state
        const imageUri = 'data:image/png;base64,' + Buffer.from(imageBuffer).toString('base64');
        return imageUri;
    }

}

export default GraphClient;
