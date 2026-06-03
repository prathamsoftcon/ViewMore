(function (window) {
    const apiConfig = {
        apiPath: "",
        apiKey: ""
    };

    function getApiPath() {
        return apiConfig.apiPath || window.APIPath || "";
    }

    function getApiKey() {
        return apiConfig.apiKey || window.apiKey || "";
    }

    function getJsonHeaders() {
        return {
            "APIKey": getApiKey(),
            "Content-Type": "application/json"
        };
    }

    function buildUrl(path, params) {
        const basePath = getApiPath();
        const query = new URLSearchParams();

        Object.keys(params || {}).forEach(function (key) {
            const value = params[key];
            if (value !== undefined && value !== null) {
                query.set(key, value);
            }
        });

        return basePath + path + (query.toString() ? "?" + query.toString() : "");
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

    function getAxiosConfig() {
        return {
            headers: getJsonHeaders()
        };
    }

    const ContentLoginApi = {
        configure: function (options) {
            const settings = options || {};

            if (settings.apiPath !== undefined) {
                apiConfig.apiPath = settings.apiPath;
            }
            if (settings.apiKey !== undefined) {
                apiConfig.apiKey = settings.apiKey;
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
                buildUrl("/UserInfo_wk", { username: "91-" + mobileNumber }),
                getAxiosConfig()
            );
        },

        generateOtp: function (mobileNumber) {
            return axios.get(
                buildUrl("/GenerateOTP_wk", { username: "91-" + mobileNumber }),
                getAxiosConfig()
            );
        },

        verifyOtp: function (username, otp) {
            return axios.get(
                buildUrl("/VerifyOTP", { username: username, otp: otp }),
                getAxiosConfig()
            );
        },

        getParticipantTrainings: function (participantId) {
            return fetchJson(buildUrl("/Participants_training_wk", { participantid: participantId }), {
                method: "GET",
                headers: getJsonHeaders()
            });
        },

        getTrainingParticipantDetails: function (trainingId, participantId) {
            return axios.get(
                buildUrl("/TRG_PARTICIPANT_DETAILS_wk", {
                    trainingid: trainingId,
                    participantid: participantId
                }),
                getAxiosConfig()
            );
        },

        getContentDetails: function (contentId, participantId) {
            return axios.get(
                buildUrl("/GET_CONTENT_DETAILS_wk", {
                    ttsam_id: contentId,
                    participantid: participantId
                }),
                getAxiosConfig()
            );
        },

        generateActivityToken: function (trainingId, contentId, participantId, ttpaiId) {
            return axios.get(
                buildUrl("/GenerateActivityToken_wk", {
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
            return axios.get(
                buildUrl("/GET_REACT_APP_CONFIGURATION_wk"),
                getAxiosConfig()
            );
        },

        checkFirstLogin: function (participantId) {
            return axios.get(
                buildUrl("/Check_First_Login_wk", { participantid: participantId }),
                getAxiosConfig()
            );
        },

        saveUserLog: function (userId) {
            return axios.post(
                buildUrl("/SAVE_USER_LOG_wk", { userid: userId }),
                {},
                getAxiosConfig()
            );
        },

        saveAuditTrail: function (eventData) {
            return axios.post(
                buildUrl("/Save_Audit_Trail"),
                eventData,
                getAxiosConfig()
            );
        },

        saveLearningTime: function (eventData) {
            return axios.post(
                buildUrl("/Learning_Time_wk"),
                eventData,
                getAxiosConfig()
            );
        },

        checkContentLearningExists: function (contentId, participantId) {
            return axios.get(
                buildUrl("/check_content_learning_exist_wk", {
                    ttsam_id: contentId,
                    participantid: participantId
                }),
                getAxiosConfig()
            );
        },

        updateSessionStatus: function (participantId, trainingId, sessionId, completionData) {
            return axios.post(
                buildUrl("/Update_Session_Status_wk", {
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
                const username = "91-" + getMobileNumber();

                if (!isValidOtp(enteredOtp)) {
                    alert(getMessage("invalidOtp", "Please enter a valid 6-digit OTP."));
                    if (settings.otpInputs && settings.otpInputs[0]) {
                        settings.otpInputs[0].focus();
                    }
                    return Promise.reject(new Error("Invalid OTP"));
                }

                return ContentLoginApi.verifyOtp(username, enteredOtp)
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
})(window);
