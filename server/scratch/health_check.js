const axios = require('axios');

async function check() {
    try {
        console.log("Checking http://localhost:5000/api/health ...");
        const res = await axios.get('http://localhost:5000/api/health');
        console.log("Response:", res.data);
        process.exit(0);
    } catch (error) {
        console.error("Health check failed:", error.message);
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        }
        process.exit(1);
    }
}

check();
