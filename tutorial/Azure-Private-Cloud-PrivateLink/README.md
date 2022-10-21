## Set Up Connectivity Between SAP BTP and SAP S/4HANA Using SAP Private Link Service

### Prerequisites

**SAP S/4HANA instance running on Azure**

**SAP Business Technology Platform Services**

- SAP Private Link service - Required to connect SAP S/4HANA using Azure Private Link service.

    SAP BTP Private Link service is currently available for SAP BTP Enterprise Account and not available with SAP BTP trial account or Free Tier service.

**Microsoft Azure**

- Azure Private Link service
       - Required to connect to SAP S/4HANA from SAP BTP.


### 1. Set Up and configure SAP Private Link service and Azure Private Link service 

To configure Azure Private Link service for SAP S/4HANA system, follow 
 [Enhance core ERP business processes with resilient applications on SAP BTP - SAP Private Link Service](https://github.com/SAP-samples/btp-build-resilient-apps/tree/extension-privatelink/tutorials/05-PrivateLink) tutorial and complete the steps till **Prepare Extension Application** section.


### 2. Set Up OAuth Configuration for SAP S/4HANA and SAP BTP


1. Download metadata on Destination.

    1. Log in to SAP BTP cockpit, navigate to your subaccount and choose **Connectivity** > **Destinations**.

    2. Choose **Download IDP Metadata** to download IDP metadata.

        ![plot](./images/btp-dest-idp-metadata.png)

2. Add Trusted Provider in SAML2.0 Configuration of ABAP System.

    1. In your SAP S/4HANA system, open the **SAML2** transaction or open the 
    ABAP WebDynpro Application - "https://s4hanahostname:port/sap/bc/webdynpro/sap/saml2?sap-client=clientnumber" and navigate to **Trusted Providers** tab.

        ![Trusted Providers](./images/Trusted%20Providers%20Tab.png)

    2. In the **List of Trusted Providers** table, choose the value **OAuth 2.0 Identity Providers** from the dropdown.<br>

        ![Oauth provider](./images/OAuth%202.0%20Identity%20Providers.png)

    3. Choose **Add** and then choose **Upload Metadata File**.<br>
        ![Add Upload Metadata](./images/upload%20Metadata%20file.png)

    4. In the **Metadata File** field, upload the metadata file that you downloaded in **Step 2**, and choose **Next**.<br>
        ![Upload MetadataFile Click NExt](./images/MetadataFile%20Click%20Next.png)

    5. Choose **Next** and then choose **Finish**.<br>

    6. Select the added **Trusted Provider** and choose **Edit**.<br>
    ![Edit Trusted Provider](./images/Trusted%20Provider%20Added.png)

    7. Scroll down and navigate to the **Identity Federation** tab and choosee **Add** to add the NameID format.<br>
    ![NameID add](./images/Add%20Supported%20NameID%20Format.png)

    8. Select **E-mail** from the list and choose **OK**.<br>
    ![NameID add](./images/Email%20NameID%20Format.png)

    9. Choose **Save**.<br>

    10. Choose **Enable** to enable the trusted provider.<br>

        ![Enable Trusted Provider](./images/Enable%20Trusted%20Provider.png)

### 3. Create User ID

For registering an inbound OAuth client, you need to create an User ID in the system, which will be the Client ID.

1. In your SAP S/4HANA system, open **SU01** transaction,enter an unique value in the **User** field and choose **Create** icon.<br>
    ![userid create](./images/UserID%20Create.png)

2. In the **Logon Data** tab, in the **User Type** field,choose **Sytem** from the dropdown menu.
        ![user type](./images/System%20User%20Type.png)

3. Provide an initial password and choose **Save**.

### 4. Provide Read Authorization to the User ID

You need to provide read authorization for the OData service 'API_PURCHASEREQ_PROCESS_SRV' to the newly created user.
>Note: Providing authorization here will help in setting up the SAP BTP destination in the upcoming steps.

1. In your SAP S/4HANA system, open **PFCG** transacation, enter a role name and choose **Create Single Role**.<br>

    ![Single Role](./images/Create%20PFCG%20role.png)

2. In the **Authorizations** tab, choose **Propose profile names** to create a profile.

    ![Propose Profile](./images/Propose%20Profile%20name.png)

3. Choose **Change Authorizatoin Data** icon to add the authorizations.
![AUthorization data](./images/Change%20Authorization%20Data.png)<br>

    <br>**Note**: If a popup shows to save the role, click **Save** and if another popup opens to **Choose Template**, choose **Do not select templates**.<br>

4. Choose **Manually** to add the Authorization object.<br>
![Auth Object](./images/Manually%20add%20auth.png)<br>

5. In the **Authorization Object** field, enter **S_SERVICE** and chooose **Ok**.<br>
![Auth Object](./images/Auth%20Object.png)<br>

6. Choose **Edit** icon to provide the OData service details.<br>
![Auth Object](./images/Add%20service.png)<br>

7. In the popup, select **TADIR Service** from **Type** dropdown menu.<br>
![Auth Object](./images/Tadir%20Service.png)<br>

8. Provide the oData service details as shown below and choose **Save**.<br>
![Auth Object](./images/Auth%20Objects%20adding.png)<br>

9. Choose **Save** again.<br>
![Auth Object](./images/Save%20Authorization.png)<br>

10. Choose **Generate** icon to generate the profile.<br>
![Auth Object](./images/Generate%20Auth.png)<br>

11. Enter the user ID and choose **User Comparison**.<br>
![Auth Object](./images/Add%20user%20to%20role.png)<br>

### 5. Create an Inbound OAuth Client

1. In your SAP S/4HANA system, open the **SOAUTH2** transaction  or use the below URL to configure the oAuth client and choose **Create**.<br>
**URL** - https://s4hanahostname:port/sap/bc/webdynpro/sap/oauth2_config?sap-client=clientnumber
![Create OAuth](./images/Create%20OAuth%20Client.png)

2. In the **OAuth 2.0 Client** field, enter the user id which you created in step 3 ,provide the description and choose **Next**.
![Step 1 OAuth](./images/Oauth2.0%20step1.png)

3. Choose **Next** again.

4. In the **Resource Owner Authentication** step, choose the **Trusted OAuth 2.0 Identity provider** that you created in **Step 2** and choose **Next**.
![Step 3 OAuth](./images/Trusted%20OAuth%202.0%20Idp%20Step%203.png)

5. In the **Scope Assignment**, add the Task Processing OData service **ZTASKPROCESSING_0002**, choose **Next** and then choose **Finish**.
![Step 4 OAuth Scope](./images/Scope%20Oauth%20step4.png)

**Note**: If the OData service ZTASKPROCESSING_0002 is not listed in the **OAuth 2.0 Scope ID**, you need to manually enable OAuth for it as mentioned below:

1. Open the **/n/iwfnd/maint_service** transaction.
2. Select the service **ZTASKPROCESSING** and choose the **OAuth** button to enable OAuth scope for the service
![Enable OAuth scope](./images/Enable%20OAuth.png)

### 6. Create Destinations in your subaccount in SAP BTP

Follow the steps to create destinations for principal propogations between Microsoft Teams to SAP S/4HANA.

1. In the SAP BTP cockpit, navigate to you subaccount and choose **Connectivity** > **Destinations**.

2. Create a destination with name **s4BasicAuth**.

    1. Choose **New Destination** and enter the following configuration values

        key | value |
        --- | --- |
        Name | s4BasicAuth |
        Type | HTTP |
        URL | https://yourprivate hostname |
        Proxy Type | PrivateLink |
        Authentication | Choose Basic Authentication and provide details of user **TEAMSCLIENT**|
        scope | ZTASKPROCESSING_0002 |
        >Note: **TEAMSCLIENT** is the user that you created in the previous steps for the OAuth Client.

        
        Add the below additional properties:  

        key | value |
        --- | --- |
        sap-client | your SAP Client no |
        TrustAll | true |
        HTML5.DynamicDestination | true |
        WebIDEEnabled | true |
        WebIDEUsage | odata_abap |

    2. Create a destination with the name "s4oauth". (This is used to request SAMLAssertion from SAP backend (OAuth server))

        1. Choose **New Destination** and enter the following configuration values

            key | value |
            --- | --- |
            Name | s4oauth |
            Type | HTTP |
            URL | https://your private hostname/sap/bc/sec/oauth2/token?sap-client=[your client no] |
            Proxy Type | PrivateLink |
            Authentication | SAMLAssertion |
            Audience | check Provider Name on **SAML2 backend transaction** |
            AuthnContextClassRef | urn:oasis:names:tc:SAML:2.0:ac:classes:x509 |

            Add the below additional properties: 

            key | value |
            --- | --- |
            sap-client | your client no |
            TrustAll | true |
            HTML5.DynamicDestination | true |
            WebIDEEnabled | true |
            WebIDEUsage | odata_abap |
            nameIdFormat | urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress |
            tokenServiceURL  | https://your private hostname/sap/bc/sec/oauth2/token |
            assertionRecipient  | https://your private hostname/sap/bc/sec/oauth2/token |
            userSourceId  | email

    3. Create destination with the name "s4NoAuth". (This is used for final call to OData without Authentication, we inject the Bearer token from preceeding calls)

        1. Choose **New Destination** and enter the following configuration values

            key | value |
            --- | --- |
            Name | s4NoAuth |
            Type | HTTP |
            URL | identical to first destination |
            Proxy Type | PrivateLink |
            Authentication | No Authentication |

            Add the below additional properties: 

            key | value |
            --- | --- |
            sap-client | your client no |
            TrustAll | true |
            HTML5.DynamicDestination | true |
            WebIDEEnabled | true |
            WebIDEUsage | odata_abap |

For additional details on Private Link service, refer to the GitHub repository [az-private-linky](https://github.com/MartinPankraz/az-private-linky) by Martin Pankraz.
