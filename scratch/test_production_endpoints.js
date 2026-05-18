const axios = require('axios');

async function testStats() {
  try {
    console.log('1. Attempting login to live backend...');
    const loginResponse = await axios.post('https://t-yap-d0rj.onrender.com/api/auth/login', {
      username: 'superadmin@tyap.com',
      password: 'SuperAdmin123!'
    });

    const token = loginResponse.data.token || loginResponse.data.data?.token;
    if (!token) {
      console.error('Login succeeded but no token returned. Response:', loginResponse.data);
      return;
    }
    console.log('Login successful! Token acquired.');

    console.log('2. Requesting dashboard stats from live backend...');
    const statsResponse = await axios.get('https://t-yap-d0rj.onrender.com/api/admin/dashboard-stats?period=monthly', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('Dashboard Stats Response:', JSON.stringify(statsResponse.data, null, 2));
  } catch (error) {
    console.error('Error during testing:', error.response ? {
      status: error.response.status,
      data: error.response.data
    } : error.message);
  }
}

testStats();
