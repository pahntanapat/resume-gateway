//const { ResumeBase } = require("./resume");

const socket = io({
    transports: ["websocket", "polling"]
});
var app = new Vue({
    el: '#app',
    data: {
        resume: null,
        history: [],
        inputHN: "",
        HN: Math.round(Math.random() * 10000000).toString(),
        TXN: '#Random ' + Math.round(Math.random() * 10000000) + '#',

        // Form
        CC: "",
        PI: "",
        PHx: "",
        Allergy: "",
        FamHx: "",
        PE: "",
        Dx: "",
        A: "",
        Tx: "",
        FU: "",
        // Response

        // tCC: "",
        tPI: "",
        tPHx: "",
        tAllergy: "",
        tFamHx: "",
        // tPE: "",
        tDx: "",
        tA: "",
        tTx: "",
        tFU: "",

        showRecorder: true,
        //startRecord: false,
        btnRecordValue: "Press Microphone button to Record",

        interval: null,

        sectionList: [],
        sectionID: Math.round(Math.random() + 1).toString(),
    },
    methods: {
        autoEndSession: function () {
            this.resume.tag = '';
            switch (this.resume.getStatus()) {
                case REC_PAUSED:
                case REC_RECORDING:
                    this.stopRecord();
                    break;
                default:
                    break;
            }
            return;
        },
        submitHN: function () {
            var value = this.inputHN && this.inputHN.trim();
            if (!value) {
                alert('Please input HN number');
                return;
            }
            log('Instantiate recorder for HN: ' + this.inputHN)

            this.HN = this.inputHN;
            // add HN name TXN lookup somewhere here
            // for example
            this.TXN = '#Random ' + Math.round(Math.random() * 100) + '#';
            //this.HN_txt = 'Recorder for HN: ' + this.HN;

            this.showRecorder = true;
            this.btnRecordValue = 'Press Microphone button to Record';
            // this.renderServerFiles(this.HN);
        },
        checkCurrent: function () {
            log('Active HN: ' + this.HN);
            return this.HN;
        },
        changeHN: function () {
            switch (this.resume.getStatus()) {
                case REC_RECORDING:
                    alert('Cannot change HN during record, Please click pause button');
                    return;
                case REC_PAUSED:
                    this.stopRecord();
                    break;

            }
            this.inputHN = "";
            this.TXN = null;
            this.inputHN = "";
            this.showRecorder = false;
            this.btnRecordValue = 'Record';
            //this.recorder = null;
            //this.reclist = null;
            this.history = [];

        },
        toggleRecord: function () {
            switch (this.resume.getStatus()) {
                case REC_PAUSED:
                    this._resume();
                    break;
                case REC_RECORDING:
                    this._pause();
                    break;
                default:
                    this._startRecord();
                    break;
            }
        },
        _startRecord: function () {
            this.resume.newSession(this._getHint(), { HN: this.HN, TXN: this.TXN }, this.sectionList[this.sectionID].name, this.sectionList[this.sectionID].format);
            this.interval = setInterval(this._tick, 1000);
            //this.startRecord = true;
            this.btnRecordValue = 'Listening...';
            log('Recording...');
        },

        _pause: function () {
            this.resume.pause();
            //this.startRecord = false;
            this.btnRecordValue = '(' + Math.round(this.resume.getRecordTime()) + ' s) Click to Resume';
            clearInterval(this.interval);
        },

        _resume: function () {
            this.interval = setInterval(this._tick, 1000);
            this.resume.resume();
        },

        stopRecord: function () {
            this.resume.endSession(this._getUserTranscribe());
            this.btnRecordValue = 'saving...';
            log('Stopped recording.');
            //this.startRecord = false;
            clearInterval(this.interval);
            this.interval = null;
        },
        _stopRecCallback: function (history) {
            this.history.push(history);
        },
        _onReceiveTranscript: function (transcript, isEnd) {
            log('Recieved Transcript.. ' + JSON.stringify(transcript));
            if (isEnd) {
                this.btnRecordValue = 'Record';
            }
            if (transcript.MlGroupTxt) {
                let t = transcript.MlGroupTxt;
                this.tPI = t.history_of_present_illness_section;
                this.tPHx = t.past_medical_history_section;
                this.tFamHx = t.family_history_section;
                this.tAllergy = t.allergies_and_intolerances_section;
                this.tDx = t.problem_section;
                this.tA = t.assessment_section;
                this.tTx = t.plan_of_treatment_section;
                this.tFU = transcript.MlGroupTxt.follow_up_section;
            }
        },
        appendSuggest: function (input, text) {
            this[input] += " " + text;
        },
        _getHint: function () {
            // get Hint for voice transcriber
            // From Chief complaint, Nurse Cheif complaint, or prefilled History
            return [this.CC, this.PI, this.PHx];
        },
        _getUserTranscribe: function () {
            // this Format is in ./med_rec_format.json

            return {
                chief_complaint_section: this.CC,
                history_of_present_illness_section: this.PI,
                past_medical_history_section: this.PHx,
                family_history_section: this.FamHx,
                allergies_and_intolerances_section: this.Allergy,
                physical_exam_section: this.PE,
                problem_section: this.Dx,
                assessment_section: this.A,
                plan_of_treatment_section: this.Tx,
                follow_up_section: this.FU
            };
        },

        _tick: function () {
            this.btnRecordValue = '(' + Math.round(this.resume.getRecordTime()) + ' s) Click to Pause';
        },

        checkNumeric: function (e) {
            let char = String.fromCharCode(e.keyCode)
            if (!/[0-9]/.test(char)) {
                e.preventDefault()
            }
        },
        randomuid: function () {
            return Math.round((1 + Math.random()) * Date.now());
        },
        loadSection: function () {
            ResumeOne.loadSectionList().then((res) => {
                this.sectionList = res;
                return res;
            });
        }

    },
    computed: {
        isRecording: function () {
            return this.resume && (this.resume.getStatus() == REC_RECORDING);
        },
        recordBtnClass: function () {
            isRec = this.isRecording;
            return {
                transition: isRec,
                red: isRec
            }
        },
        hasActiveResumeSession: function () {
            return this.resume && ((this.resume.getStatus() == REC_RECORDING) || (this.resume.getStatus() == REC_PAUSED));
        }
    },
    mounted: function () {
        //this._uid = this.randomuid();
        this.resume = new ResumeOne(socket, {
            getIntermediateUserTranscript: this._getUserTranscribe,
            onReceiveTranscript: this._onReceiveTranscript,
            multiSpeaker: true
        });
        this.loadSection();
        document.addEventListener('beforeunload', this.autoEndSession);
        new UserLimit(socket, '#usedTime');
    },
});
function log(e) {
    let time = new Date();
    let hr = time.getHours(),
        min = (time.getMinutes() < 10) ? '0' + time.getMinutes() : time.getMinutes(),
        sec = (time.getSeconds() < 10) ? '0' + time.getSeconds() : time.getSeconds();
    if (!e) {
        $("#log").html('');
        return;
    }
    $("#log").prepend('<li>(' + hr + ':' + min + ':' + sec + ') –– ' + e + '</li>')
}
