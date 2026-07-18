// Column definitions for the three bulk-import templates (learners,
// instructors, staff). Shared between template generation (what the admin
// downloads to fill in) and parsing (matching the columns they actually
// uploaded back to these keys) — one definition drives both, so the two
// can never silently drift apart.
//
// `required` drives the validation error a blank cell produces; everything
// else is optional per the user's ask ("class info is mandatory, mobile
// number also... other information which are not mandatory can be kept as
// optional"). Login credentials (email/username/password) are a special
// case: none of the three is individually required, but if any one of them
// is filled in, all three must be (see server/lib/bulkUploadProcessor.js) —
// a person record can exist with no portal login at all (onec_learners./
// onec_instructors./onec_staff./onec_guardians.user_id are all nullable),
// which is the common case for a first bulk roster import.
const PERSON_LOGIN_COLUMNS = [
  { key: 'email', header: 'Login Email', aliases: ['email', 'loginemail'] },
  { key: 'username', header: 'Login Username', aliases: ['username', 'loginusername'] },
  { key: 'password', header: 'Login Password', aliases: ['password', 'loginpassword'] }
];

const LEARNER_COLUMNS = [
  { key: 'first_name', header: 'First Name *', required: true, aliases: ['firstname'] },
  { key: 'last_name', header: 'Last Name *', required: true, aliases: ['lastname'] },
  {
    key: 'class_name',
    header: 'Class *',
    required: true,
    aliases: ['class', 'classname', 'cohort', 'cohortname']
  },
  {
    key: 'mobile',
    header: 'Mobile Number *',
    required: true,
    aliases: ['mobilenumber', 'mobile', 'phone', 'phonenumber']
  },
  { key: 'registry_no', header: 'Registry / Roll No', aliases: ['registryno', 'rollno', 'admissionno'] },
  { key: 'gender', header: 'Gender', aliases: ['gender'] },
  { key: 'dob', header: 'Date of Birth', aliases: ['dob', 'dateofbirth'] },
  { key: 'address', header: 'Address', aliases: ['address'] },
  ...PERSON_LOGIN_COLUMNS,
  { key: 'guardian_first_name', header: 'Guardian First Name', aliases: ['guardianfirstname'] },
  { key: 'guardian_last_name', header: 'Guardian Last Name', aliases: ['guardianlastname'] },
  {
    key: 'guardian_phone',
    header: 'Guardian Mobile Number',
    aliases: ['guardianmobilenumber', 'guardianmobile', 'guardianphone']
  },
  { key: 'guardian_email', header: 'Guardian Email', aliases: ['guardianemail'] },
  { key: 'guardian_address', header: 'Guardian Address', aliases: ['guardianaddress'] }
];

const STAFF_LIKE_COLUMNS = [
  { key: 'first_name', header: 'First Name *', required: true, aliases: ['firstname'] },
  { key: 'last_name', header: 'Last Name *', required: true, aliases: ['lastname'] },
  {
    key: 'mobile',
    header: 'Mobile Number *',
    required: true,
    aliases: ['mobilenumber', 'mobile', 'phone', 'phonenumber']
  },
  { key: 'staff_id', header: 'Staff / Employee ID', aliases: ['staffid', 'employeeid'] },
  { key: 'gender', header: 'Gender', aliases: ['gender'] },
  ...PERSON_LOGIN_COLUMNS
];

const ENTITY_FIELDS = {
  learner: { label: 'Students', columns: LEARNER_COLUMNS, sampleFileName: 'students' },
  instructor: { label: 'Teachers', columns: STAFF_LIKE_COLUMNS, sampleFileName: 'teachers' },
  staff: { label: 'Staff', columns: STAFF_LIKE_COLUMNS, sampleFileName: 'staff' }
};

// One example row per template, shown pre-filled so the admin can see the
// expected shape before deleting it and adding real rows.
const SAMPLE_ROWS = {
  learner: {
    'First Name *': 'Aiden',
    'Last Name *': 'Fernandes',
    'Class *': 'Grade 5A',
    'Mobile Number *': '9876543210',
    'Registry / Roll No': '',
    Gender: 'male',
    'Date of Birth': '2015-06-12',
    Address: '',
    'Login Email': '',
    'Login Username': '',
    'Login Password': '',
    'Guardian First Name': 'Maria',
    'Guardian Last Name': 'Fernandes',
    'Guardian Mobile Number': '',
    'Guardian Email': '',
    'Guardian Address': ''
  },
  instructor: {
    'First Name *': 'Rahul',
    'Last Name *': 'Menon',
    'Mobile Number *': '9876500000',
    'Staff / Employee ID': '',
    Gender: 'male',
    'Login Email': '',
    'Login Username': '',
    'Login Password': ''
  },
  staff: {
    'First Name *': 'Priya',
    'Last Name *': 'Nair',
    'Mobile Number *': '9876511111',
    'Staff / Employee ID': '',
    Gender: 'female',
    'Login Email': '',
    'Login Username': '',
    'Login Password': ''
  }
};

function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

module.exports = { ENTITY_FIELDS, SAMPLE_ROWS, normalizeHeader };
