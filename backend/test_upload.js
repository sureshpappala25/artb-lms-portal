const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

async function run() {
    try {
        const loginRes = await axios.post('http://localhost:5001/api/auth/login', {
            email: 'admin',
            password: 'admin@123'
        });
        const token = loginRes.data.token;

        const formData = new FormData();
        formData.append('document', fs.createReadStream('test_exam.docx'));

        const uploadRes = await axios.post('http://localhost:5001/api/exams/generate-from-doc', formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': 'Bearer ' + token
            }
        });

        fs.writeFileSync('result.json', JSON.stringify(uploadRes.data, null, 2));
    } catch (e) {
        console.error(e.response ? e.response.data : e.message);
    }
}
run();
