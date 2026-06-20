(function (window) {
    const apiConfig = {
        apiPath: "",
        publicApiPath: "/public-api",
        publicApiKey: ""
    };

    function getApiPath() {
        return apiConfig.apiPath || window.APIPath || "";
    }

    function getPublicApiPath() {
        return apiConfig.publicApiPath || window.PublicAPIPath || "/public-api";
    }

    function getPublicApiKey() {
        return apiConfig.publicApiKey || window.PublicAPIKey || window.PUBLIC_API_KEY || "";
    }

    function buildHeaders(extraHeaders, includeBearer, includePublicApiKey) {
        const headers = Object.assign({
            "Content-Type": "application/json"
        }, extraHeaders || {});
        const publicApiKey = includePublicApiKey ? getPublicApiKey() : "";

        if (includeBearer) {
            const token = getAccessToken();
            if (token) {
                headers.Authorization = "Bearer " + token;
            }
        }

        delete headers.APIKey;
        delete headers.ApiKey;
        delete headers.apiKey;

        if (publicApiKey) {
            headers.APIKey = publicApiKey;
        }

        return headers;
    }

    function buildUrl(path, params, basePath) {
        const resolvedBasePath = basePath || getApiPath();
        const query = new URLSearchParams();

        Object.keys(params || {}).forEach(function (key) {
            const value = params[key];
            if (value !== undefined && value !== null) {
                query.set(key, value);
            }
        });

        return resolvedBasePath + path + (query.toString() ? "?" + query.toString() : "");
    }

    async function fetchJson(url, options) {
        const response = await fetch(url, options);
        const data = await response.json().catch(function () {
            return null;
        });

        if (!response.ok) {
            const message = data && data.message ? data.message : "HTTP error! Status: " + response.status;
            throw new Error(message);
        }

        return data;
    }

    function getPublicAxiosConfig(includePublicApiKey) {
        return {
            headers: buildHeaders(null, false, includePublicApiKey === true),
            withCredentials: true
        };
    }

    function getAxiosConfig() {
        return {
            headers: buildHeaders(null, true),
            withCredentials: true
        };
    }

    function getPublicRequestConfig() {
        return {
            headers: buildHeaders(),
            withCredentials: true
        };
    }

    function publicGet(path, params) {
        return axios.get(
            buildUrl(path, params, getPublicApiPath()),
            getPublicRequestConfig()
        );
    }

    function publicPost(path, data, params) {
        return axios.post(
            buildUrl(path, params, getPublicApiPath()),
            data,
            getPublicRequestConfig()
        );
    }

    function getStoredUser() {
        try {
            return JSON.parse(localStorage.getItem("user"));
        } catch {
            return null;
        }
    }

    function unwrapUserToken(data) {
        return data && data.result ? data.result : data;
    }

    function storeAuthenticatedUser(data) {
        const user = unwrapUserToken(data);

        if (!user || !user.authToken) {
            throw new Error("Authentication response did not contain an auth token.");
        }

        localStorage.setItem("user", JSON.stringify(user));
        window.dispatchEvent(new CustomEvent("littera:authentication-updated"));
        return user;
    }

    function getAccessToken() {
        const storedUser = getStoredUser();
        return storedUser && (storedUser.authToken || (storedUser.user && storedUser.user.authToken) || (storedUser.result && storedUser.result.authToken)) || "";
    }

    function hasAuthToken(data) {
        const user = unwrapUserToken(data);
        return !!(user && user.authToken);
    }

    const ContentLoginApi = {
        configure: function (options) {
            const settings = options || {};

            if (settings.apiPath !== undefined) {
                apiConfig.apiPath = settings.apiPath;
            }
            if (settings.publicApiPath !== undefined) {
                apiConfig.publicApiPath = settings.publicApiPath;
            }
            if (settings.publicApiKey !== undefined) {
                apiConfig.publicApiKey = settings.publicApiKey;
            }
        },

        loadConfig: function (configPath) {
            return fetchJson(configPath || "./html_config.json", {
                method: "GET",
                cache: "no-store"
            });
        },

        getUserInfo: function (mobileNumber) {
            return axios.get(
                buildUrl("/Authentication/api/UserInfo_wk", { username: "91-" + mobileNumber }),
                getAxiosConfig()
            );
        },

        generateOtp: function (mobileNumber) {
            return publicGet("/GenerateOTP", { username: "91-" + mobileNumber });
        },

        verifyOtp: function (username, otp) {
            return publicGet("/VerifyOTP", { username: username, otp: otp });
        },

        getToken: function (loginData) {
            return publicPost("/GetToken", loginData);
        },

        sendGeneralOtp: function (params) {
            return publicGet("/Send_General_OTP", params || {});
        },

        loginFailEntry: function (payload) {
            return publicPost("/Login_Fail_Entry", payload || {});
        },

        registerWithOtp: function (payload) {
            return publicPost("/RegisterWithOtp", payload || {});
        },

        getTrainingDetailsPublic: function (trainingId) {
            return publicGet("/Training_Details", { trainingid: trainingId });
        },

        getTrgSessions: function (params) {
            return publicGet("/TrgSessions", params || {});
        },

        getTrgSponsor: function (params) {
            return publicGet("/TRG_SPONSOR", params || {});
        },

        getAgency: function (params) {
            return publicGet("/Agency", params || {});
        },

        getSalutation: function (params) {
            return publicGet("/Salutation", params || {});
        },

        getBranches: function (params) {
            return publicGet("/Branches", params || {});
        },

        getApplicationSetting: function (params) {
            return publicGet("/Get_Application_Setting", params || {});
        },

        getFinancialYear: function (params) {
            return publicGet("/Finacial_year", params || {});
        },

        getClientData: function (params) {
            return publicGet("/GetClientData", params || {});
        },

        getParticipantTrainings: function (participantId) {
            return fetchJson(buildUrl("/Participants_training", { participantid: participantId }), {
                method: "GET",
                headers: buildHeaders(null, true)
            });
        },

        getTrainingParticipantDetails: function (trainingId, participantId) {
            return axios.get(
                buildUrl("/TRG_PARTICIPANT_DETAILS", {
                    trainingid: trainingId,
                    participantid: participantId
                }),
                getAxiosConfig()
            );
        },

        getContentDetails: function (contentId, participantId) {
            return axios.get(
                buildUrl("/GET_CONTENT_DETAILS", {
                    ttsam_id: contentId,
                    participantid: participantId
                }),
                getAxiosConfig()
            );
        },

        generateActivityToken: function (trainingId, contentId, participantId, ttpaiId) {
            return axios.get(
                buildUrl("/GenerateActivityToken", {
                    trainingid: trainingId,
                    ttsm_id: contentId,
                    apipath: getApiPath(),
                    userid: participantId,
                    ttpai_id: ttpaiId
                }),
                getAxiosConfig()
            );
        },

        getReactAppConfiguration: function () {
            return publicGet("/GET_REACT_APP_CONFIGURATION");
        },

        checkFirstLogin: function (participantId) {
            return axios.get(
                buildUrl("/Check_First_Login", { participantid: participantId }),
                getAxiosConfig()
            );
        },

        saveUserLog: function (userId) {
            return axios.post(
                buildUrl("/SAVE_USER_LOG", { userid: userId }),
                {},
                getAxiosConfig()
            );
        },

        saveAuditTrail: function (eventData) {
            return publicPost("/Save_Audit_Trail", eventData);
        },

        saveAuditTrailWk: function (eventData) {
            return publicPost("/Save_Audit_Trail_wk", eventData);
        },

        saveErrorLog: function (eventData) {
            return publicPost("/Save_Error_Log", eventData);
        },

        saveLearningTime: function (eventData) {
            return axios.post(
                buildUrl("/Learning_Time"),
                eventData,
                getAxiosConfig()
            );
        },

        checkContentLearningExists: function (contentId, participantId) {
            return axios.get(
                buildUrl("/check_content_learning_exist", {
                    ttsam_id: contentId,
                    participantid: participantId
                }),
                getAxiosConfig()
            );
        },

        updateSessionStatus: function (participantId, trainingId, sessionId, completionData) {
            return axios.post(
                buildUrl("/Update_Session_Status", {
                    Participantid: participantId,
                    trainingid: trainingId,
                    Sessionid: sessionId,
                    timeonsession: 0,
                    status: 0
                }),
                completionData,
                getAxiosConfig()
            );
        }
    };

    window.ContentLoginApi = ContentLoginApi;
    window.ContentLoginApi.getAccessToken = getAccessToken;
    window.ContentLoginApi.getPublicAxiosConfig = getPublicAxiosConfig;
    window.ContentLoginApi.getAuthAxiosConfig = getAxiosConfig;
    window.ContentLoginApi.getPublicHeaders = function () {
        return buildHeaders();
    };
    window.ContentLoginApi.getAuthHeaders = function () {
        return buildHeaders(null, true);
    };
    window.ContentLoginApi.storeAuthenticatedUser = storeAuthenticatedUser;
    window.ContentLoginApi.hasAuthToken = hasAuthToken;

    const ContentLoginStorage = {
        setWithExpiry: function (key, value, days) {
            const now = new Date();
            const expiryDays = days || 15;
            const item = {
                value: value,
                expiry: now.getTime() + expiryDays * 24 * 60 * 60 * 1000
            };

            localStorage.setItem(key, JSON.stringify(item));
        },

        getWithExpiry: function (key) {
            const itemStr = localStorage.getItem(key);
            if (!itemStr) {
                return null;
            }

            const item = JSON.parse(itemStr);
            const now = new Date();

            if (now.getTime() > item.expiry) {
                localStorage.removeItem(key);
                return null;
            }

            return item.value;
        }
    };

    function createOtpService(options) {
        const settings = options || {};
        const otpLength = settings.otpLength || 6;
        const messages = settings.messages || {};

        function getMessage(key, fallback) {
            return messages[key] || fallback;
        }

        function showLoader() {
            if (settings.loaderElement) {
                settings.loaderElement.style.display = "flex";
            }
        }

        function hideLoader() {
            if (settings.loaderElement) {
                settings.loaderElement.style.display = "none";
            }
        }

        function getMobileNumber() {
            return settings.mobileInput ? settings.mobileInput.value : "";
        }

        function getEnteredOtp() {
            return Array.from(settings.otpInputs || []).map(function (input) {
                return input.value;
            }).join("");
        }

        function resetOtpInputs() {
            Array.from(settings.otpInputs || []).forEach(function (input) {
                input.value = "";
            });

            if (settings.otpInputs && settings.otpInputs[0]) {
                settings.otpInputs[0].focus();
            }
        }

        function showOtpSection() {
            if (settings.mobileSection) {
                settings.mobileSection.style.display = "none";
            }
            if (settings.otpSection) {
                settings.otpSection.style.display = "block";
            }
            if (settings.otpSentMessage) {
                settings.otpSentMessage.style.display = "block";
            }
            if (settings.mobileInput) {
                settings.mobileInput.disabled = true;
            }

            resetOtpInputs();

            if (typeof settings.onOtpSent === "function") {
                settings.onOtpSent();
            }
        }

        function isValidMobile(mobileNumber) {
            return mobileNumber.length === 10 && /^\d+$/.test(mobileNumber);
        }

        function isValidOtp(otp) {
            return otp.length === otpLength && /^\d+$/.test(otp);
        }

        return {
            requestOtp: function () {
                const mobileNumber = getMobileNumber();

                showLoader();

                if (!isValidMobile(mobileNumber)) {
                    hideLoader();
                    alert(getMessage("invalidMobile", "Please enter valid 10-digit mobile number."));
                    if (settings.mobileInput) {
                        settings.mobileInput.focus();
                    }
                    return Promise.reject(new Error("Invalid mobile number"));
                }

                return ContentLoginApi.generateOtp(mobileNumber)
                    .then(function (response) {
                        hideLoader();

                        if (response.status === 200) {
                            showOtpSection();
                            return response;
                        }

                        alert(getMessage("mobileNotRegistered", "Your number is not registered. Please contact administrator."));
                        return response;
                    })
                    .catch(function (error) {
                        hideLoader();

                        if (error.response) {
                            const apiMessage = error.response.data && error.response.data.message
                                ? error.response.data.message
                                : "Unknown error";
                            alert(getMessage("apiErrorPrefix", "API Error: ") + error.response.status + " - " + apiMessage);
                        }

                        throw error;
                    });
            },

            verifyOtp: function () {
                const enteredOtp = getEnteredOtp();
                const mobileNumber = getMobileNumber();

                if (!isValidOtp(enteredOtp)) {
                    alert(getMessage("invalidOtp", "Please enter a valid 6-digit OTP."));
                    if (settings.otpInputs && settings.otpInputs[0]) {
                        settings.otpInputs[0].focus();
                    }
                    return Promise.reject(new Error("Invalid OTP"));
                }

                return ContentLoginApi.getToken({
                    emailid: "91-" + mobileNumber,
                    mobile: "91-" + mobileNumber,
                    otp: enteredOtp,
                    countryCode: "91"
                })
                    .then(function (response) {
                        if (response.status === 200 && typeof settings.onOtpVerified === "function") {
                            settings.onOtpVerified(response);
                        }

                        return response;
                    })
                    .catch(function (error) {
                        if (error.response) {
                            alert(getMessage("invalidOtp", "Invalid OTP,Please enter valid OTP"));
                        } else if (error.request) {
                            alert(getMessage("noResponse", "No response received from server."));
                        }

                        throw error;
                    });
            },

            resendOtp: function () {
                if (getMobileNumber()) {
                    return this.requestOtp();
                }

                return Promise.reject(new Error("Mobile number is required"));
            },

            editMobile: function () {
                if (settings.mobileSection) {
                    settings.mobileSection.style.display = "block";
                }
                if (settings.otpSection) {
                    settings.otpSection.style.display = "none";
                }
                if (settings.otpSentMessage) {
                    settings.otpSentMessage.style.display = "none";
                }
                if (settings.mobileInput) {
                    settings.mobileInput.disabled = false;
                    settings.mobileInput.focus();
                }
            },

            bindOtpInputs: function () {
                Array.from(settings.otpInputs || []).forEach(function (input, index) {
                    input.addEventListener("input", function () {
                        if (input.value.length === 1 && index < settings.otpInputs.length - 1) {
                            settings.otpInputs[index + 1].focus();
                        }
                    });

                    input.addEventListener("keydown", function (event) {
                        if (event.key === "Backspace" && input.value === "" && index > 0) {
                            settings.otpInputs[index - 1].focus();
                        }
                    });
                });
            }
        };
    }

    window.ContentLoginStorage = ContentLoginStorage;
    window.createContentLoginOtpService = createOtpService;
    window.storeAuthenticatedUser = storeAuthenticatedUser;
    window.getContentLoginAuthToken = getAccessToken;
})(window);
