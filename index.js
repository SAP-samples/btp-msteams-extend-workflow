
/**
 * index.js is used to setup the whole Microsoft Teams extension application
 * It defines the available routes for bot messages, API calls, notifications and static content
 */

// Import required packages
import path from 'path'
import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url';

// Import environment variables and routers
import './loadEnv.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url));
//const PORT = process.env.PORT || 4001;

const PORT = process.env.PORT || 3333;



// Create HTTP server
const server = express();

server.use(cors());
server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(express.static(path.resolve(__dirname, './client/build')))

// Load bot framwork adapter and bot activity handler
import adapter from './server/bots/botAdapter.js'
import botActivityHandler from './server/bots/botActivityHandler.js'

import { MessageFactory,TeamsInfo } from 'botbuilder'
import * as adaptiveCards from './server/models/adaptiveCard.js'
import s4HANAClient from './server/services/S4HANAClient.js';



// Import filters (passport strategies) to authenticate requests
import {teamsFilter} from './server/filters/teamsFilter.js'
import {xsuaaFilter} from './server/filters/xsuaaFilter.js'

// bot endpoint which is handling bot interaction
server.post('/api/messages', async (req, res) => { 
    console.log(req.body)
    await adapter.process(req, res, (context) => botActivityHandler.run(context)) 
})

server.post('/em/pr-workflow', async(req, res) => {
  if(req.body && Object.keys(req.body).length != 0){
    const prId = req.body.NUMBER;
    const wfId = req.body.WI_ID;
    const MAIL_ID = req.body.MAIL_ID;
    const data = await s4HANAClient.getPRDetailsUsingCloudSdk(prId)
    
    try{
        for (const conversationReference of Object.values(botActivityHandler.conversationReferences)) {
            await adapter.continueConversation(conversationReference, async turnContext => {
                const userEmail = await getSingleMember(turnContext)
                console.log("email Id :"+userEmail.email)
                if(userEmail.email === MAIL_ID){
                  const payload = data.d;
                  console.log("workflow Id :"+wfId)
                  payload.wfId = wfId;
                  const card = adaptiveCards.PurchaseRequisitionCard(payload)
                  await turnContext.sendActivity(MessageFactory.attachment(card));
                } 
            });
        } 
    }catch(err) {
        console.log(err);
      }
}
   res.status(200).send();
})

async function getSingleMember(context) {
  try {
      const member = await TeamsInfo.getMember(
          context,
          context.activity.from.id
      );
      return member;
  } catch (e) {
      if (e.code === 'MemberNotFoundInConversation') {
          return context.sendActivity(MessageFactory.text('Member not found.'));
      } else {
          throw e;
      }
  }
}

server.listen(PORT, () => { console.log(`Server listening on http://localhost:${ PORT }`)});
