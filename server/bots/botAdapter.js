/**
 * botAdapter.js returns a new instance of the BotFrameworkAdapter which is required
 * for the bot implementation. It makes use of the client id and secret of the app registration.
 */

import { BotFrameworkAdapter } from 'botbuilder';

// Lightweight handler for errors during a turn
const onTurnErrorHandler = async (context, error) => {
    // This check writes out errors to console log
    console.error(`\n [onTurnError] unhandled error: ${ error }`);

    // Send a trace activity, which will be displayed in Bot Framework Emulator
    await context.sendTraceActivity('OnTurnError Trace',`${ error }`,'https://www.botframework.com/schemas/error','TurnError');

    // Send a message to the user
    await context.sendActivity('The bot encountered an error or bug.');
    await context.sendActivity('To continue to run this bot, please fix the bot source code.');
    
    // Clear out state
    await conversationState.delete(context);
}

// Create a new adapter instance
const adapter = new BotFrameworkAdapter({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

adapter.onTurnError = onTurnErrorHandler;

export default adapter