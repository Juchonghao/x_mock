// 验证Cookie JSON格式的测试脚本
const fs = require('fs');
const path = require('path');

// 读取.env文件
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

// 提取TWITTER_COOKIES行
const cookiesLine = envContent.split('\n').find(line => line.startsWith('TWITTER_COOKIES='));

if (cookiesLine) {
  // 提取等号后的内容
  const cookiesContent = cookiesLine.split('=')[1].trim();
  
  console.log('提取的Cookie内容:');
  console.log(cookiesContent);
  
  try {
    // 解析JSON（处理转义）
    // 首先将 \" 替换为 "
    let unescapedContent = cookiesContent.replace(/\\"/g, '"');
    
    // 移除可能存在的额外引号
    if (unescapedContent.startsWith('"') && unescapedContent.endsWith('"')) {
      unescapedContent = unescapedContent.slice(1, -1);
    }
    
    console.log('\n处理后的内容:');
    console.log(unescapedContent);
    
    const cookies = JSON.parse(unescapedContent);
    console.log('\n✓ JSON格式正确!');
    console.log('Cookie数量:', cookies.length);
    
    // 打印每个Cookie的名称
    cookies.forEach((cookie, index) => {
      console.log(`Cookie ${index + 1}: ${cookie.name}`);
    });
  } catch (error) {
    console.log('\n✗ JSON格式错误:', error.message);
    console.log('错误位置:', error.stack.split('at')[0]);
  }
} else {
  console.log('未找到TWITTER_COOKIES配置');
}