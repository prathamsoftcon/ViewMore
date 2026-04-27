# Certificate Flow

This document describes the end-to-end flow used in certificate.html.

## Entry Point

- Page load triggers CHECK_MOBILE_ON_LOAD().
- CHECK_MOBILE_ON_LOAD() calls DirectVerify_And_Print().

## Direct Access Behavior

- If URL contains ttpai_id, the page directly calls Get_Certificate_Data(ttpai_id).
- If ttpai_id is missing, the mobile verification modal is opened.

## Mobile Verification Flow

- User enters a 10-digit mobile number and clicks Request OTP.
- requestOtp() first validates the mobile format.
- requestOtp() checks local storage cache key: certificate_otp_cache.

### Local Storage Cache Rules

- Cache is valid only when all conditions are true:
- Mobile number in cache matches entered number.
- Cache has userid and agencyid.
- Cache timestamp is not older than 15 days.

When valid cache is found:
- OTP generation and OTP verification are skipped.
- Cached userid and agencyid are used.
- Flow proceeds directly to Get_trainings(agencyid).

When cache is missing or expired:
- API call GenerateOTP is executed.
- OTP section is displayed for user verification.

## OTP Verify

- User enters 6-digit OTP and clicks Verify OTP.
- verifyOtp() calls VerifyOTP API.
- On success, cache is stored in local storage with:
- mobileNumber
- userid
- agencyid
- response payload
- savedAt timestamp
- Then flow moves to Get_trainings(agencyid).

## Training Selection

- Get_trainings(agencyid) fetches participant trainings.
- Trainings are shown in ddltraining dropdown.
- User selects training and clicks Generate Certificate.

## Certificate Generation

- Get_Training_Participant_Details() fetches participant training detail.
- Extracted ttpai_id is passed to Get_Certificate_Data().
It uses API Certificate_Details
- Get_Certificate_Data() fetches certificate details and fills:
- Name
- Enrollment number
- Grade
- Print date
- It also fetches training name via Get_Training_Data(trainingid).

## Audit and Logging

- update_Audit_Trail() is called when certificate is generated.
- saveUserLog() is called as part of audit flow.

## Print

- Print button calls PrintCertificate().
- window.print() opens print dialog for certificate printing.

## Alert Path

- If user is not eligible/authorized, the alert modal is shown.
- Alert modal informs user to complete reading/practical activities first.
