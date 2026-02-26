import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'سياسة الخصوصية | أسواق سجاد',
    description: 'سياسة الخصوصية لتطبيق أسواق سجاد المحمول',
};

export default function PrivacyPolicyPage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl min-h-screen bg-gray-50 text-right" dir="rtl">
            <div className="bg-white rounded-2xl shadow-sm p-6 md:p-10">
                <h1 className="text-3xl font-bold text-gray-900 mb-8 border-b pb-4 border-gray-100">سياسة الخصوصية</h1>

                <div className="space-y-6 text-gray-700 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-semibold text-gray-800 mb-3">مقدمة</h2>
                        <p>
                            نحن في <strong>أسواق سجاد</strong> ("نحن" أو "التطبيق") نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية. توضح سياسة الخصوصية هذه كيفية جمع واستخدام والكشف عن وحماية معلوماتك عند استخدامك لتطبيق أسواق سجاد على الأجهزة المحمولة.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-800 mb-3">المعلومات التي نجمعها</h2>
                        <ul className="list-disc list-inside space-y-2 pr-4 text-gray-600">
                            <li><strong>المعلومات الشخصية المدخلة:</strong> مثل اسمك ورقم هاتفك وعنوانك عند إنشاء حساب أو تقديم طلب شراء.</li>
                            <li><strong>معلومات الموقع:</strong> قد نطلب الوصول إلى موقعك الجغرافي لتسهيل عملية التوصيل وتحديد موقعك بدقة على الخريطة.</li>
                            <li><strong>معلومات الجهاز:</strong> مثل نوع الجهاز ونظام التشغيل والمعرفات الفريدة وتوكن الإشعارات (FCM Token) لغرض إرسال تحديثات الطلبات والإشعارات.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-800 mb-3">كيفية استخدام معلوماتك</h2>
                        <p>نحن نستخدم المعلومات التي نجمعها في المقام الأول للأغراض التالية:</p>
                        <ul className="list-disc list-inside space-y-2 pr-4 text-gray-600 mt-2">
                            <li>إنشاء وإدارة حسابك ضمن التطبيق.</li>
                            <li>معالجة وتنفيذ طلباتك وتوصيل المشتريات إلى عنوانك.</li>
                            <li>التواصل معك بخصوص حالة طلباتك من خلال مكالمات هاتفية أو إشعارات.</li>
                            <li>تحسين تجربتك وتطوير الخدمات المقدمة في التطبيق.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-800 mb-3">مشاركة المعلومات</h2>
                        <p>
                            نحن لا نقوم ببيع أو تأجير أو مشاركة معلوماتك الشخصية مع أطراف ثالثة لأغراض تسويقية. يتم مشاركة معلوماتك فقط (مثل الاسم والعنوان ورقم الهاتف) مع موظفي التوصيل لغرض وحيد وهو تسليم الطلبات إليك.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-800 mb-3">أمان البيانات</h2>
                        <p>
                            نحن نتخذ تدابير أمنية وإدارية وتقنية معقولة لحماية معلوماتك الشخصية من الوصول غير المصرح به أو التغيير أو الإفصاح. يتم تخزين بياناتك الخاصة والطلبات بشكل آمن ومحمي.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-800 mb-3">حقوق المستخدم (حذف البيانات)</h2>
                        <p>
                            يحق لك في أي وقت طلب حذف حسابك ومعلوماتك الشخصية من سجلاتنا. يمكنك ذلك من خلال التواصل معنا مباشرة أو طلب الحذف من داخل التطبيق إن توفرت تلك الميزة.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-800 mb-3">التحديثات على سياسة الخصوصية</h2>
                        <p>
                            قد نقوم بتحديث سياسة الخصوصية الخاصة بنا من وقت لآخر. سنقوم بإعلامك بأي تغييرات جوهرية عن طريق نشر السياسة الجديدة على هذه الصفحة، ولذلك ننصحك بمراجعة هذه الصفحة بشكل دوري.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-800 mb-3">اتصل بنا</h2>
                        <p>
                            إذا كان لديك أي أسئلة أو استفسارات حول سياسة الخصوصية هذه، يرجى التواصل معنا عبر:
                        </p>
                        <ul className="list-none space-y-2 mt-2 font-medium text-gray-800">
                            <li>عبر التطبيق مباشرة.</li>
                            <li>أو عبر أرقام خدمة العملاء المتوفرة.</li>
                        </ul>
                    </section>

                    <div className="mt-8 pt-6 border-t border-gray-100 text-sm text-gray-500">
                        آخر تحديث: {new Date().toLocaleDateString('ar-EG')}
                    </div>
                </div>
            </div>
        </div>
    );
}
