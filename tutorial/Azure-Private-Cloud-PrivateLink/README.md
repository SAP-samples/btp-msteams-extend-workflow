## Set Up Connectivity Between SAP BTP and SAP S/4HANA Using SAP Private Link Service

### Prerequisites
These are the prerequisities that you need to consider.

- SAP S/4HANA system running on Microsoft Azure

- SAP Private Link service
    Required to connect SAP BTP and Microsoft Azure.

    >Note: The SAP BTP Private Link service is currently available only for enterprise accounts in SAP BTP.

- Microsoft Azure Private Link service
    Required to connect Microsoft Azure and SAP S/4HANA.


### 1. Set Up the SAP Private Link Service and Microsoft Azure Private Link Service 

To configure these services for the SAP S/4HANA system, follow the 
 [Enhance core ERP business processes with resilient applications on SAP BTP - SAP Private Link Service](https://github.com/SAP-samples/btp-build-resilient-apps/blob/main/tutorials/05_setupconnectivity/privatelink.md) tutorial and complete the steps until the **Prepare Extension Application** section.


### 2. Set Up OAuth Configuration for SAP S/4HANA and SAP BTP


1. To download the identity provider metadata:

    1. Log in to SAP BTP cockpit, navigate to your subaccount and choose **Connectivity** > **Destinations**.

    2. Choose **Download IDP Metadata**.

        ![plot](./images/btp-dest-idp-metadata.png)

2. To add a trusted provider in the SAP S/4HANA system:

    1. Log in to the SAP S/4HANA system and open the **SAML2** transaction or open the 
    ABAP WebDynpro Application - **https://s4hanahostname:port/sap/bc/webdynpro/sap/saml2?sap-client=clientnumber** and navigate to the **Trusted Providers** tab.

        ![Trusted Providers](./images/Trusted%20Providers%20Tab.png)

    2. Choose **OAuth 2.0 Identity Providers** from the **Show** dropdown menu.

        ![Oauth provider](./images/OAuth%202.0%20Identity%20Providers.png)

    3. Choose **Add** and then select **Upload Metadata File** from the dropdown menu.
        
        ![Add Upload Metadata](./images/upload%20Metadata%20file.png)

    4. In the **Metadata File** field, upload the metadata file that you downloaded in **Step 1**, and choose **Next**.
        
        ![Upload MetadataFile Click NExt](./images/MetadataFile%20Click%20Next.png)

    5. Choose **Next** and then choose **Finish**.

    6. Select the added trusted provider and choose **Edit**.
        
        ![Edit Trusted Provider](./images/Trusted%20Provider%20Added.png)

    7. Scroll down and navigate to the **Identity Federation** tab and choosee **Add**.
        
        ![NameID add](./images/Add%20Supported%20NameID%20Format.png)

    8. Select **E-mail** from the list and choose **OK**.
        
        ![NameID add](./images/Email%20NameID%20Format.png)

    9. Choose **Save**.

    10. Choose **Enable** to enable the trusted provider.

        ![Enable Trusted Provider](./images/Enable%20Trusted%20Provider.png)

### 3. Create User ID

For registering an inbound OAuth client, you need to create a user ID in the system, which will be the client ID for the OAuth client.

1. In your SAP S/4HANA system, open the **SU01** transaction, enter a unique value in the **User** field and choose the **Create** icon.
    
    ![userid create](./images/UserID%20Create.png)

2. In the **Logon Data** tab, in the **User Type** field,choose **System** from the dropdown menu.
    
    ![user type](./images/System%20User%20Type.png)

3. Provide an initial password and choose **Save**.

### 4. Provide Read Authorization to the User ID

You need to provide read authorization for the **API_PURCHASEREQ_PROCESS_SRV** OData service to the newly created user.
>**Note:** Providing authorization here will help to set up the destination in the SAP BTP cockpit.

1. In your SAP S/4HANA system, open the **PFCG** transacation, enter a unique role name and choose **Single Role**.

    ![Single Role](./images/Create%20PFCG%20role.png)

2. In the **Authorizations** tab, choose the **Propose profile names** icon.

    ![Propose Profile](./images/Propose%20Profile%20name.png)

3. Choose the **Change Authorizatoin Data** icon to add the authorizations.
    
    ![AUthorization data](./images/Change%20Authorization%20Data.png)<br>

    >**Note**: If a pop-up shows to ask you to save the role, choose **Save**. If another pop-up opens to ask you to choose a template, do not select any templates.

4. Choose **Manually** to add the Authorization object.

![Auth Object](./images/Manually%20add%20auth.png)<br>

5. In the **Authorization Object** field, enter **S_SERVICE** and chooose the **Ok** icon.

    ![Auth Object](./images/Auth%20Object.png)

6. Choose the **Edit** icon to provide the OData service details.

    ![Auth Object](./images/Add%20service.png)<br>

7. In the pop-up, select **TADIR Service** from the **Type** dropdown menu.

    ![Auth Object](./images/Tadir%20Service.png)

8. Provide the oData service details as shown in the screenshot and choose **Save**.

    ![Auth Object](./images/Auth%20Objects%20adding.png)

9. Choose **Save** again.

    ![Auth Object](./images/Save%20Authorization.png)

10. Choose the **Generate** icon to generate the profile.

    ![Auth Object](./images/Generate%20Auth.png)

11. Enter the user ID from step 1 and choose **User Comparison**.

    ![Auth Object](./images/Add%20user%20to%20role.png)

### 5. Create an Inbound OAuth Client

1. In your SAP S/4HANA system, open the **SOAUTH2** transaction  or use the following URL to configure the oAuth client. Then, choose **Create**.
**URL** - **https://s4hanahostname:port/sap/bc/webdynpro/sap/oauth2_config?sap-client=clientnumber**

![Create OAuth](./images/Create%20OAuth%20Client.png)

2. In the **OAuth 2.0 Client** field, enter the user ID which you have created in step 1. Then, provide the description and choose **Next**.

![Step 1 OAuth](./images/Oauth2.0%20step1.png)

3. Choose **Next** again.

4. In the **Resource Owner Authentication** step, in the **Trusted OAuth 2.0 Identity provider** field, select the trusted provider that you have created in step 2 in the **### 2. Set Up OAuth Configuration for SAP S/4HANA and SAP BTP** section and choose **Next**.

    ![Step 3 OAuth](./images/Trusted%20OAuth%202.0%20Idp%20Step%203.png)

5. In the **Scope Assignment** step, choose **Add** and in the pop-up that appears, enter **ZTASKPROCESSING_0002** OData service, Choose **Next** and then choose **Finish**.
    ![Step 4 OAuth Scope](./images/Scope%20Oauth%20step4.png)

    >**Note**: If the **ZTASKPROCESSING_0002** OData service is not listed, you need to manually enable OAuth for it as mentioned below:
    >1. Open the **/n/iwfnd/maint_service** transaction.
    >2. Select the **ZTASKPROCESSING** OData service and choose **OAuth** to enable the OAuth scope for the service.
    ![Enable OAuth scope](./images/Enable%20OAuth.png)

### 6. Create Destinations in Your Subaccount in SAP BTP

Follow these steps to create the destinations for the principal propogation between Microsoft Teams and the SAP S/4HANA system.

1. In the SAP BTP cockpit, navigate to you subaccount and choose **Connectivity** > **Destinations**.

2. Create a destination with the name **s4BasicAuth**.

    1. Choose **New Destination** and enter the following configuration values:

        key | value |
        --- | --- |
        Name | s4BasicAuth |
        Type | HTTP |
        URL | http://your-private-hostname |
        Proxy Type | PrivateLink |
        Authentication | Basic Authentication |
        User ID | **TEAMSCLIENT** |
        Password | password for the **TEAMSCLIENT** that you created in the previous steps |
        scope | ZTASKPROCESSING_0002 |
        
    2. Add the additional properties:  

        key | value |
        --- | --- |
        sap-client | your SAP Client no |
        TrustAll | true |
        HTML5.DynamicDestination | true |
        WebIDEEnabled | true |
        WebIDEUsage | odata_abap |

2. Create another destination with the name **s4oauth**. This is used to request SAMLAssertion from the SAP S/4HANA.

    1. Choose **New Destination** and enter the following configuration values:

        key | value |
        --- | --- |
        Name | s4oauth |
        Type | HTTP |
        URL | https://your-private-hostname/sap/bc/sec/oauth2/token?sap-client=[your-client-id] |
        Proxy Type | PrivateLink |
        Authentication | SAMLAssertion |
        Audience | check the provider name on **SAML2 backend transaction** |
        AuthnContextClassRef | urn:oasis:names:tc:SAML:2.0:ac:classes:x509 |

    2. Add the additional properties: 

        key | value |
        --- | --- |
        sap-client | your client no |
        TrustAll | true |
        HTML5.DynamicDestination | true |
        WebIDEEnabled | true |
        WebIDEUsage | odata_abap |
        nameIdFormat | urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress |
        tokenServiceURL  | https://your-private-hostname/sap/bc/sec/oauth2/token |
        assertionRecipient  | https://your-private-hostname/sap/bc/sec/oauth2/token |
        userSourceId  | email

3. Create another destination with the name **s4NoAuth**. This is used for the final call to the OData service without any authentication. We inject the token for the OAuth SAML Bearer Assertion from the preceeding calls.

    1. Choose **New Destination** and enter the following configuration values:

        key | value |
        --- | --- |
        Name | s4NoAuth |
        Type | HTTP |
        URL | identical to first destination |
        Proxy Type | PrivateLink |
        Authentication | No Authentication |

    2. Add the additional properties: 

        key | value |
        --- | --- |
        sap-client | your client no |
        TrustAll | true |
        HTML5.DynamicDestination | true |
        WebIDEEnabled | true |
        WebIDEUsage | odata_abap |

For additional details about the SAP Private Link service and the Microsoft Azure Private Link service, refer to the [az-private-linky](https://github.com/MartinPankraz/az-private-linky) GitHub repository.
