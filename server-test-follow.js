const axios = require('axios');

async function testServerFollow() {
  const serverUrl = 'http://65.49.203.108:3001';
  
  try {
    console.log('🔐 测试服务器认证...');
    const authResponse = await axios.post(`${serverUrl}/api/auth/login`);
    console.log('认证结果:', authResponse.data);
    
    if (!authResponse.data.success) {
      console.log('❌ 认证失败，停止测试');
      return;
    }
    
    console.log('\n🔄 测试关注功能...');
    
    // 测试关注NHL
    const followResponse = await axios.post(`${serverUrl}/api/twitter/batch-follow`, {
      usernames: ['NHL'],
      delay: 3000
    });
    
    console.log('关注结果:', JSON.stringify(followResponse.data, null, 2));
    
    if (followResponse.data.results && followResponse.data.results[0]) {
      const result = followResponse.data.results[0];
      if (result.success) {
        console.log('✅ 成功关注NHL账号');
      } else {
        console.log('❌ 关注NHL失败:', result.error);
      }
    }
    
  } catch (error) {
    console.error('测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

testServerFollow();