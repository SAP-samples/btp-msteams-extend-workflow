class ZCL_WFCUSEMSEND_TEAMSINT definition
  public
  final
  create public .

public section.

  methods CONSTRUCTOR .
  methods RUN_EM_JOB
    importing
      !TIMESTAMP type TZNTSTMPL .
  PROTECTED SECTION.
  PRIVATE SECTION.
    TYPES: BEGIN OF ty_workitem,
             wi_id  TYPE swwwihead-wi_id,
             tclass TYPE swwwihead-tclass,
           END OF ty_workitem.
    TYPES ty_workitem_tab TYPE TABLE OF ty_workitem WITH EMPTY KEY.
    DATA: dest_name    TYPE c LENGTH 20,
          auth_profile TYPE c LENGTH 20,
          auth_conf    TYPE c LENGTH 20,
          oa2c_client  TYPE REF TO if_oauth2_client.

    METHODS get_delta_workflow_instances
      IMPORTING
        timestamp        TYPE tzntstmpl
      RETURNING
        VALUE(workitems) TYPE ty_workitem_tab .

    METHODS connect_to_em
      RETURNING
        VALUE(http_client) TYPE REF TO if_http_client.
    METHODS send_workitem_to_em
      IMPORTING
        http_client TYPE REF TO if_http_client
        workitem    TYPE ty_workitem.
ENDCLASS.



CLASS ZCL_WFCUSEMSEND_TEAMSINT IMPLEMENTATION.


  METHOD constructor.

    dest_name = 'EM_CONNECT_TEAMS'.
    auth_profile = '/IWXBE/MGW_MQTT'.
    auth_conf = 'EM_OAUTH_CLIENT'.

  ENDMETHOD.


  METHOD get_delta_workflow_instances.

    " Fetching the workitems that are created in the last n minutes(timestamp)
    SELECT wi_id, tclass
      INTO TABLE @workitems
      FROM swwwihead
     WHERE
   wi_rh_task = 'TS02000714' AND " Purchase requistion task
      wi_stat = @swfco_wi_status_ready AND
      wi_type = @swfco_wi_normal       AND
     crea_tmp > @timestamp.
  ENDMETHOD.


  METHOD connect_to_em.

    " Get the destination http client
    cl_http_client=>create_by_destination(
                                  EXPORTING  destination = dest_name
                                  IMPORTING  client                   = http_client
                                  EXCEPTIONS argument_not_found       = 1
                                             destination_not_found    = 2
                                             destination_no_authority = 3
                                             plugin_not_active        = 4
                                             internal_error           = 5
                                             OTHERS                   = 6 ).
    http_client->propertytype_logon_popup = if_http_client=>co_disabled.
    IF sy-subrc <> 0.
* Raise error and exception handling in case of instation of http_client failed
    ENDIF.

**  Set token for authorization OAuth 2.0
    TRY.
        cl_oauth2_client=>create( EXPORTING i_profile        = CONV #( auth_profile )
                                            i_configuration  = CONV #( auth_conf )
                                  RECEIVING ro_oauth2_client = oa2c_client ).
      CATCH cx_oa2c.
* Raise error and exception handling in case of client creation failed for OAuth profile
    ENDTRY.


    TRY.
        oa2c_client->set_token( EXPORTING io_http_client = http_client ).

      CATCH cx_oa2c.
        TRY.
          " Executing the client credentials flow
            CALL METHOD oa2c_client->execute_cc_flow.
          CATCH cx_oa2c.
* Raise error and exception handling in case of token set is failed
        ENDTRY.

        TRY.
            oa2c_client->set_token( EXPORTING io_http_client = http_client ).
          CATCH cx_oa2c.
* Raise error and exception handling in case of token set is failed
        ENDTRY.
    ENDTRY.

    DATA(request_headers) = VALUE tihttpnvp( ( name  = 'x-qos'
                                               value = '1' ) ).



** Set URI tfeindia/s4/t1/
    " Purchase Requisition Queue in the event mesh
    cl_http_utility=>set_request_uri( EXPORTING  request = http_client->request
                                                 uri     = '/messagingrest/v1/queues/tfeindia%2Fs4%2Ft1%2Fs4%2FPRApproval/messages' ).

** Set request headers for the call if passed
    LOOP AT request_headers ASSIGNING FIELD-SYMBOL(<header>).
      http_client->request->set_header_field( EXPORTING  name  = <header>-name
                                                            value = <header>-value ).
    ENDLOOP.

    http_client->refresh_cookie( ).

** Set Request Method (GET/POST/PATCH)
    http_client->request->set_method( method = 'POST' ).
  ENDMETHOD.


  METHOD run_em_job.
    " Get the delta workitems tha are newly created
    DATA(workitems) = get_delta_workflow_instances( timestamp = timestamp ).

    CHECK workitems IS NOT INITIAL.

    " Getting the HTTP client(OAuth Based) to send the data to Event Mesh
    DATA(http_client) = connect_to_em( ).
    LOOP AT workitems ASSIGNING FIELD-SYMBOL(<workitem>).
      send_workitem_to_em(
        http_client = http_client
        workitem     = <workitem> ).
    ENDLOOP.
  ENDMETHOD.


  METHOD send_workitem_to_em.

    TYPES:
      BEGIN OF ty_wf_action,
        action_id   TYPE string,
        action_desc TYPE string,
      END   OF ty_wf_action.
    TYPES ty_wf_actions TYPE TABLE OF ty_wf_action WITH DEFAULT KEY.
    DATA:
      BEGIN OF wi_em,
        wi_id       TYPE string,
        user_id     TYPE string,
        mail_id     TYPE string,
        description TYPE string,
        number      TYPE eban-banfn,
        item        TYPE eban-bnfpo,
        actions     TYPE ty_wf_actions,
      END OF wi_em,
      wi_agents TYPE swrtwiagent,
      wi_object TYPE swr_obj_2.

      " Get the agent
    CALL FUNCTION 'SAP_WAPI_GET_WI_AGENTS'
      EXPORTING
        workitems = VALUE swrtwiid( ( workitem-wi_id ) )
      IMPORTING
        wi_agents = wi_agents.

      " Get the basic workflow details
    SELECT SINGLE wi_id, wfd_id, reference_nodeid, wi_text
      FROM swwwihead
      INTO @DATA(wi_head)
     WHERE wi_id = @workitem-wi_id.
    IF sy-subrc EQ 0.
      " Get the available decisions, this is based on the existing configuration
      " and will only work if the configuration is maintained in SPRO, path:
      " SAP Customizing Implementation Guid -> SAP Netweaver -> SAP Gateway Service Enablement -> Content ->
      " -> Workflow Settings -> Maintain Task Names and Decision Options
      " By default these entries will be filled from SAP, you need to do this if you have a custom workflow
      SELECT *
        FROM /iwwrk/c_wfdect
        INTO TABLE @DATA(decisions)
       WHERE workflow_id = @wi_head-wfd_id
         AND step_id = @wi_head-reference_nodeid
         AND langu = 'E'.
      LOOP AT decisions ASSIGNING FIELD-SYMBOL(<decision>).
        APPEND VALUE ty_wf_action( action_id = <decision>-altkey action_desc = <decision>-description ) TO wi_em-actions.
      ENDLOOP.
    ELSE.
      " TODO: should do better expection handling
      RETURN.
    ENDIF.

    DATA :
      messages TYPE bapiret2_t,
      address  TYPE bapiaddr3.

    " To read the email id
    CALL FUNCTION 'BAPI_USER_GET_DETAIL'
      EXPORTING
        username = CONV bapibname-bapibname( wi_agents[ 1 ]-user ) " Always an user is expected, should do better expection handling
      IMPORTING
        address  = address                 " Address Data
      TABLES
        return   = messages.                 " Return Structure

    wi_em-description = wi_head-wi_text.
    wi_em-wi_id = wi_head-wi_id.
    wi_em-user_id = wi_agents[ 1 ]-user.
    wi_em-mail_id = address-e_mail.

    " Purchase requsition details from the workflow
    CALL FUNCTION 'SAP_WAPI_GET_OBJECTS'
      EXPORTING
        workitem_id      = workitem-wi_id
      IMPORTING
        leading_object_2 = wi_object.

    DATA: BEGIN OF pr_key,
            number TYPE eban-banfn,
            item   TYPE eban-bnfpo,
          END OF pr_key.

    pr_key = wi_object-instid.

    wi_em-number = pr_key-number.
    wi_em-item = pr_key-item.

    " Convert to JSON
    /ui2/cl_json=>serialize(
       EXPORTING
       data             = wi_em
       RECEIVING
       r_json           = DATA(json)                 " JSON string
       ).

    http_client->request->set_content_type(
      EXPORTING
        content_type = if_rest_media_type=>gc_appl_json ).

    http_client->request->set_cdata( json ).

    http_client->send( EXCEPTIONS  http_communication_failure = 1
                                   http_invalid_state = 2
                                   http_processing_failed = 3
                                   http_invalid_timeout  = 4 ).
    IF sy-subrc <> 0.
* Raise error and exception handling if call is failed
    ENDIF.

********Fire Recieve call to fetch response from (http_client)

    http_client->receive( EXCEPTIONS http_communication_failure = 1
                                     http_invalid_state         = 2
                                     http_processing_failed     = 3 ).

    IF sy-subrc <> 0.
* Raise error and exception handling if response is not received
    ENDIF.

    DATA: headers TYPE tihttpnvp.

**** Fetch Response Headers
    CALL METHOD http_client->response->get_header_fields( CHANGING fields = headers ).

    http_client->response->get_status( IMPORTING code = DATA(code) )." Get workitem data

  ENDMETHOD.
ENDCLASS.
