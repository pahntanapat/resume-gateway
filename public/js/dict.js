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
        procedure_findings_section: "",
        operative_note_surgical_procedure_section: "",
        procedure_description_section: "",
        // Response

        r_procedure_findings_section: "",
        r_operative_note_surgical_procedure_section: "",
        r_procedure_description_section: "",

        showRecorder: true,
        //startRecord: false,
        btnRecordValue: "Press Microphone button of each form to Record",

        interval: null,

        sectionList: [],
        sectionID: 3,
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
            this.TXN = '#Random ' + Math.round(Math.random() * 10000000) + '#';
            //this.HN_txt = 'Recorder for HN: ' + this.HN;

            this.showRecorder = true;
            this.btnRecordValue = "Press Microphone button of each form to Record";
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
            this.btnRecordValue = "Press Microphone button to Record";
            //this.recorder = null;
            //this.reclist = null;
            this.history = [];

        },/*  //use dictation() instead of toggleRecord
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
        },*/
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
            this.btnRecordValue = '(' + Math.round(this.resume.getRecordTime()) + ' s) waiting for start';
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
                this.btnRecordValue = 'Press Microphone button to Record';
            }
            if (transcript.TagRawTxt) {
                this.r_procedure_findings_section = transcript.TagRawTxt.procedure_findings_section;
                this.r_operative_note_surgical_procedure_section = transcript.TagRawTxt.operative_note_surgical_procedure_section;
                this.r_procedure_description_section = transcript.TagRawTxt.procedure_description_section;
            }
        },
        dictate: function (from) {
            //alert(from);
            // check if pause >> resume, running >> pause, stop >> start
            switch (this.resume.getStatus()) {
                case REC_PAUSED:
                    this.resume.tag = from;
                    this._resume();
                    break;
                case REC_RECORDING:
                    if (from == this.resume.tag) {
                        this._pause();
                    } else {
                        this.resume.tag = from;
                    }
                    break;
                default:
                    this.resume.tag = from;
                    this._startRecord();
                    break;
            }
        },
        appendSuggest: function (input, text) {
            this[input] += " " + text;
        },
        dictateClass: function (from) {
            let run = this.resume && (from == this.resume.tag) && this.isRecording;
            return { 'red': run, 'stop': run, 'microphone': !run, 'blue': !run };
        },
        _getHint: function () {
            // get Hint for voice transcriber
            // From Chief complaint, Nurse Cheif complaint, or prefilled History
            return Object.values(this._getUserTranscribe());
        },
        _getUserTranscribe: function () {
            // this Format is in ./med_rec_format.json

            return {
                procedure_findings_section: this.procedure_findings_section,
                operative_note_surgical_procedure_section: this.operative_note_surgical_procedure_section,
                procedure_description_section: this.procedure_description_section,
            };
        },

        _tick: function () {
            this.btnRecordValue = 'Listening... ' + Math.round(this.resume.getRecordTime()) + ' s';
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
            multiSpeaker: false
        });
        ResumeOne.loadSectionList().then((res) => {
            this.sectionList = res;
            for (var i in this.sectionList) {
                this.sectionList[i].format == "Operative-Note"
                this.sectionID = i;
                break;
            }
            return res;
        });
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
