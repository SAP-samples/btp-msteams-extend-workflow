# Connecting to SAP S/4HANA on Azure using SAP BTP Connectivity Service.

## Solution Architecture

### Recommended Architecture to connect to SAP S/4HANA on Azure using SAP BTP Connectivity Service.

![plot](../../images/Architecture-CC.png)

## Prerequisites

**SAP S/4HANA on Azure**

**SAP Business Technology Platform **

- Cloud Foundry Subaccount
    >
    > - Foundation for running the MS Teams extension application.
    > - Required for Azure AD - SAP BTP Trust Configuration
    > - Required to connect to  SAP S/4HANA using SAP Cloud connector
    >
- Connectivity Service
    >
    > - Required to establish connectivity between SAP S/4HANA and a SAP BTP application.
    >
- Destination Service
    >
    > - Required to consume SAP S/4HANA API or ODATA service using SAP BTP application.

## Configuration

![plot](./images/scc_diagram.png)

For the above architecture, let us perform the below set of configurations.

### Download and install SAP Cloud Connector 
The SAP Cloud Connector can be downloaded from this link https://tools.hana.ondemand.com/#cloud. If Java is not installed on the server, it is required to install Java.

![plot](./images/scc_download.png)

You can download the zip archive for your operating system. You need administrator access to install the SCC on an on-premise server. Once downloaded, run the installation package and follow the on-screen installation guide. If the installation is successful, the SAP Cloud Connector is started automatically.

**Initial Configuration**

To configure the SCC, enter https://hostname:8443 in a browser, where the <hostname> is the hostname of the machine on which the connector is installed, and the port number is the one configured during installation. The default port number is 8443.

<br/>
<p align="center">
  <img src="./images/scc_logon.png"width="75%" height="75%">
</p>

Enter below default credentials (case sensitive) and click on Login:

Username: **Administrator** \
Password: **manage**

The first time you log in, you must change the password and choose Master as the installation type. Click on Save.

Click on Add Subaccount and provide information of your SAP BTP so we you configure a secure tunnel between the SCC and SAP BTP.

![plot](./images/scc_initial_setup.png)


The following entries are mandatory:

 | key | value |
 | --- | --- |
 | Region | The region you were you subaccount is created |
 | Subaccount | Your subaccount ID |
 | Login E-Mail | E-mail addressed used when creating the SAP BTP account |
 | Password | Password used when creating the SAP BTP account |

**Creating “Cloud to on-premise” Connection**

To make a on-premise resource available to the services on the SAP Business Technology Platform subaccount we first need to create a mapping between the SCC and the on-premise system.

In the SCC admin cockpit firstly make sure you select the right one in case you have created more than one subaccount , click on “Cloud to On-premise” in the menu on the left followed by a click on the “+” sign to the right. This will open the guide for adding mappings.

![plot](./images/cloudconnector.png)

Follow the wizard which opens up to create a HTTPS mapping.

**Internal Host** is the hostname or ip address of the backend system and the corresponding ICM port

**Virtual Host** is the host name you will be using in the SAP BTP, you can select the default value which are the same as the Internal Host or select another less revealing name.

The **Principal Type** we will change it to **Principal Propagation**.

Lastly you get a summary of the entered data and if you like you can tick the **Check Internal Host** which will perform a simple check to verify that the mapping is working.

Next, we need to add resources to the mapping i.e., services from the backend Select the newly created mapping and click the "+" sign just below to add resources. we make all services available to the subaccount by entering / in the URL path and select **Path And All Sub-Paths** under Access Policy.

As soon as Cloud connector setup is complete you able to see it in your SAP BTP Account.

![plot](./images/btp-cc.png)


## Principal Propagation Setup

Read the below blog post which explains how to setup Principal Propogation as well.\
https://blogs.sap.com/2021/09/06/setting-up-principal-propagation/

https://blogs.sap.com/2020/10/01/principal-propagation-in-a-multi-cloud-solution-between-microsoft-azure-and-sap-cloud-platform-scp-part-ii

Principal propagation enables the transmission of the message's user context from the sender to the receiver while maintaining its integrity. 

There are two different levels of trust that can be set. The Cloud Connector must first authenticate itself using the system certificates for HTTPs. In order to forward a transient X.509 certificate, we secondly need to permit this identity to spread appropriately. We then map the user in the destination system, in this case the on-premises SAP S/4HANA system. 

Information about the Cloud user is contained in the subject of the X.509 certificate, and this information is used to map the user to the equivalent user in the target system.

### Generate Certificates in Cloud Connector
We have to configure the following certificates in Cloud Connector:

**System Certificate**
To configure the System Certificate, go to Configuration → On Premise → System Certificate → Create and import a self-signed certificate.

![plot](./images/system_cert.png)


Fill the required details in the pop-up window. The Common Name (CN) represents the server name protected by the SSL certificate. The request hostname must match the certificate common name for a valid certificate.

![plot](./images/create_sso.png)

Download the generated certificate

The downloaded sys_cert.der certificate will be used in the steps below. It will be uploaded to  the SAP S/4HANA on-premise backend system (STRUST).

![plot](./images/download_cert.png)


**CA Certificate**

A CA certificate  signs all the certificates that are used when a request is forwarded from the Cloud with the Cloud principals.

To create the CA certificate, scroll down to the corresponding section and click on the “Create and import a self-signed certificate” button.

![plot](./images/config_ca_cert.png)


Fill the required details in the pop-up window to generate the certificate.

<img src="./images/config_caa_sscer.png" width="80%" height="80%">

The Cloud connector acts as a CA when the request is sent from the SAP BTP to SAP S/4HANA on-premise system. Every request from the SAP BTP will be signed from Cloud Connector with this certificate. SAP S/4HANA must trust this certificate to establish the communication from cloud to the on-premise system.


**User Certificate**

Scroll down to the Principal propagation section and edit the Subject Pattern

<img src="./images/user_cert.png" width="75%" height="75%">

Select the Subject Pattern from the list to assert the user IDs. For example, Select ${mail} to assert the user against the user’s mail address propagated from the Cloud.

<img src="./images/edit_pp.png" width="80%" height="80%">


Note: You can select the Subject Pattern depending on the assertion attribute. You can also provide manual pattern if it is not listed in the dropdown. For example, ${email}.

click on the Create Sample Certificate button
<br/>
<img src="./images/create_cert.png" width="75%" height="75%">


This sample certificate is used to define the rules in the SAP S/4HANA On-premise system under the Transaction code (CERTRULE).

<br/>
<img src="./images/cn_email.png" width="75%" height="75%">

### Synchronize the Cloud Subaccount IDP
You can follow the help document on how to add the subaccount in the Cloud connector here.

Go to Cloud To On-Premise → Principal Propagation tab. Click on the Synchronize button to sync the Trust Configuration details of the connected subaccount.


<br/>
<img src="./images/update_pp.png" width="75%" height="75%">


**Configure Backend System details in Cloud Connector** <br/>
Create a new System Mapping and provide the Internal and Virtual host details. Choose the Protocol as HTTPS and Principal Type as 509 Certificate (General Usage).

<br/>
<img src="./images/system_mapping.png" width="80%" height="80%">

**Configure SAP S/4HANA On-Premise Backend System with Certificates for the Principal Propagation Setup**

You can do the necessary configurations using the following procedure:

Import the System certificate downloaded from the Cloud Connector into the SSL Server standard (Transaction code – STRUST).
Define the rule-based mapping by importing the Sample certificate downloaded from Cloud Connector. (Transaction code – CERTRULE)
Maintain the reverse proxy parameters in the Default Profile. (Transaction code – RZ10)
Restart the ICM and check the profile parameters. (Transaction code – SMICM)

**Import the System Certificate**
Go to the transaction code STRUST
Expand the SSL Server Standard and go to the Instance Specific as shown in the below image. If there is no existing SSL Server Standard, switch to the edit mode and right click on the SSL Server standard to create one.

<img src="./images/trust_manager.png" >

Click on the Import Certificate button to import the System certificate downloaded from the Cloud Connector (sys_cert.der).

Click on “Add to Certificate list” to add the certificate to the list of trusted certificates.

<img src="./images/import_cert.png" >


**Define the Rule-based Mapping**
Go to the transaction code CERTRULE.
Click on the “Import Certificate” button to import the Sample certificate (scc_sample_cert.der) that was downloaded from the Cloud Connector in section 1.3.

<img src="./images/trust_rule.png" width="75%" height="75%">

Click on the Rule button to map the rules.


<img src="./images/create_rule.png" width="75%" height="75%">


Choose the Certificate Attr and login as E-Mail (or user name as per the requirement).
You can view the Status after a Save.

<img src="./images/cert_status.png" width="75%" height="75%">


**Maintain Profile Parameters**
Go to the transaction RZ10
Choose Profile DEFAULT and then Edit button for Extended Maintenance.


<img src="./images/edit_profile.png" width="75%" height="75%">

Click on New Parameter button

<img src="./images/new_param.png">


Give the Parameter name as “icm/trusted_reverse_proxy_0” and value as

SUBJECT=”CN=<>”, ISSUER=”CN=<>”.

You can copy these values from the Cloud Connector System Certificate section (1.1).

After filling the values, click on Copy.

<img src="./images/main_user.png" width="75%" height="75%">

Go back and Save parameter. Activate the DEFAULT profile.

<img src="./images/activate_profile.png">

You can ignore the error check validations at this point.

**Restart the ICM**<br/>
Go to the transaction SMICM.
You can restart the ICM to reflect the changes related to the PROFILES and parameters.
Go to Administration → ICM → Exit Soft → Global.

<img src="./images/restart_icm.png" >

## Destination Creation

Open the SAP BTP Cockpit in your browser and log in with your account admin.
Navigate to your trial account and select **Connectivity** –  **Destinations** from the left side navigation menu.
Click New **Destination**.

Enter the following configuration values:<br/> 
**For Principal Propagation**

| key | value |
| --- | --- |
  |  Name | S4HANA_PP |
 |   Type | HTTP |
  |  URL | The virtual host and port, e.g. http://vhcalnplci:44300 |
  |  Proxy Type | OnPremise |
  |  Authentication | PrincipalPropagation |

**Additional Properties**

  | key | value |
  |  --- | --- |
  |  sap-client | your client no |
  |  TrustAll | true |
  |  HTML5.DynamicDestination | true |
  |  WebIDEEnabled | true |
  | WebIDEUsage | odata_abap |

**For Basic Authentication**

   | key | value |
   | --- | --- |
   | Name | S4HANA_NP |
   | Type | HTTP |
   | URL | The virtual host and port, e.g. http://vhcalnplci:44300 |
   | Proxy Type | OnPremise |
   | Authentication | BasicAuthentication |
   | User| Technical User |
   | Password| Technical User Password | 

**Additional Properties**

   | key | value |
   | --- | --- |
   | sap-client | your client no |
   | TrustAll | true |
   | HTML5.DynamicDestination | true |
   | WebIDEEnabled | true |
   | WebIDEUsage | odata_abap |

**Note:** The destination name is hardcoded in the application. If you change the name of the destination here, you have to change the code as well in S4HANAClient.js.
Apart from this, there are a few changes required to be done in ApprovalDialog.js based on the type of Authentication method selected.