import os
import json
import urllib.request

# 1. ضع مفتاح API الخاص بك هنا
API_KEY = "re_your_api_key_here"  

url = "https://api.resend.com/emails"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# 2. قم بتعديل هذا الإيميل ليصبح إيميلك الشخصي الذي تريد استقبال الرسالة عليه
dst_email = "your-email@gmail.com"

data = {
    "from": "رابطة الهواء الطلق لولاية سطيف <info@lapalejsetif.com>",
    "to": [dst_email],
    "subject": "رسالة تجريبية من Python",
    "html": "<h3>مرحباً!</h3><p>هذه رسالة تجريبية من السكربت للتحقق من عمل Resend.</p>"
}

req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers, method="POST")

print("جاري إرسال الرسالة...⏳")

try:
    with urllib.request.urlopen(req) as response:
        result = response.read()
        print("\n✅ تم إرسال الرسالة بنجاح!")
        print("معلومات الاستجابة:", result.decode("utf-8"))
        
except urllib.error.HTTPError as e:
    print("\n❌ حدث خطأ من خادم Resend:")
    print(f"رمز الخطأ (Status Code): {e.code}")
    print(f"تفاصيل الخطأ: {e.read().decode('utf-8')}")
    
except Exception as e:
    print("\n❌ خطأ غير متوقع:", str(e))
