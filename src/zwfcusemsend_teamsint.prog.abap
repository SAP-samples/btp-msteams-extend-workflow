*&---------------------------------------------------------------------*
*& Report ZWFCUSEMSEND_TEAMSINT
*&---------------------------------------------------------------------*
*&
*&---------------------------------------------------------------------*
REPORT zwfcusemsend_teamsint.


DATA:
        timestamp TYPE tzntstmpl.

" TODO: currently we are sending for the last 1 minute pr workitems in the background job  to event mesh,
" ideally a better logic to handle processed and pending workitems should be inplace
GET TIME STAMP FIELD timestamp .
timestamp = cl_abap_tstmp=>add( tstmp = timestamp secs = -60 ).
NEW zcl_wfcusemsend_teamsint( )->run_em_job( timestamp = timestamp ).
