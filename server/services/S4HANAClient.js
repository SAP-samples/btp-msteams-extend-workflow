import core from "@sap-cloud-sdk/core";
import AuthClient from "./AuthClient.js";
import axios from 'axios';

class S4HANAClient {
  constructor() { 
    this.sapClient = process.env.SAP_CLIENT;
  }

  async callWFActionUsingCloudSdk(wfId, decisionKey, jwtToken) {
    const approveUrl = `/sap/opu/odata/IWPGW/TASKPROCESSING;mo;v=2/Decision?sap-client=${this.sapClient}&SAP__Origin='LOCAL_TGW'&InstanceID='${wfId}'&DecisionKey='${decisionKey}'`;
    const destinationName = "S4HANA_PP";

    try {
      let response = await core.executeHttpRequest(
        {
          destinationName: destinationName, jwt: jwtToken
        },
        {
          method: "POST",
          url: approveUrl,
        },
        { fetchCsrfToken: true }
      );
      return response.status;
    } catch (err) {
      return 500;
    }
  }

  async callWFActionUsingPrivateLinkPP(wfId, decisionKey, jwtToken) {

    const approveUrl = `/sap/opu/odata/IWPGW/TASKPROCESSING;mo;v=2/Decision?sap-client=${this.sapClient}&SAP__Origin='LOCAL_TGW'&InstanceID='${wfId}'&DecisionKey='${decisionKey}'`;
    try {
      //get destination url from vcap
      const VCAP_SERVICES = JSON.parse(process.env.VCAP_SERVICES);
      const s4oauthDestConfigUrl = VCAP_SERVICES.destination[0].credentials.uri + "/destination-configuration/v1/destinations/s4oauth";
      //fetch accesstoken for SAML principal propagation
      const authClient = new AuthClient();
      const destinationDetails = await authClient.getDestinationDetails(VCAP_SERVICES.destination[0].credentials, "s4BasicAuth");
      const samlConfiguration = await authClient.getSamlDestinationConfiguration(s4oauthDestConfigUrl, jwtToken);
      const finalBearerToken = await authClient.getBearerForSAML(destinationDetails, samlConfiguration);
      const finalDestinationDetails = await authClient.getDestinationDetails(VCAP_SERVICES.destination[0].credentials, "s4NoAuth");
      let responseStatus = await this.executeWF(finalDestinationDetails, finalBearerToken, approveUrl);
      return responseStatus;
    }
    catch (err) {
      console.log("Test Message error " + err);
      return 500;
    }
  }

  async executeWF(finalDestinationDetails, finalBearerToken, approveUrl) {
    //fetch csrf token
    let res;
    let csrfToken;
    let cookie;
    const destinationConfiguration = finalDestinationDetails.destinationConfiguration;
    const xcsrfUrl = destinationConfiguration.URL + approveUrl;
    try {
      res = await axios.get(xcsrfUrl,
        {
          headers: {
            'Authorization': `Bearer ${finalBearerToken}`,
            'x-csrf-token': 'fetch'
          }
        }
      );
      csrfToken = res.headers['x-csrf-token'];
      cookie = res.headers['set-cookie'].join("; ");
    } catch (err) {
      csrfToken = err.response.headers['x-csrf-token'];
      cookie = err.response.headers['set-cookie'].join("; ");
      console.log("err while fetching xcsrftoken is :  " + err);
    }
    //execute wf
    try {
      let response = await axios.post(xcsrfUrl, null,
        {
          headers: {
            'Authorization': `Bearer ${finalBearerToken}`,
            'x-csrf-token': csrfToken,
            'Cookie': cookie
          }
        }
      );
      return response.status;
    } catch (err) {
      console.log("err while approving PR is : " + err);
      return 500;
    }

  }

  async getPRDetailsUsingCloudSdk(prId) {
    const url = `/sap/opu/odata/sap/API_PURCHASEREQ_PROCESS_SRV/A_PurchaseRequisitionHeader('${prId}')?$expand=to_PurchaseReqnItem&$format=json`;
    let destName = "S4HANA_NP";
    const scenario = process.env.SCENARIO;
    if (scenario === "azureprivatecloud") {
      destName = "s4BasicAuth";
    }
    console.log("destName : " + destName);
    try {
      let response = await core.executeHttpRequest(
        { destinationName: destName },
        {
          method: "GET",
          url: url,
        }
      );
      return response.data;
    } catch (err) {
      console.log("Cloud Sdk Error: " + err);
      return 500;
    }
  }
}

const s4HANAClient = new S4HANAClient();

export default s4HANAClient;
