import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data (optional - comment out if you want to keep existing data)
  await prisma.fAQ.deleteMany();
  await prisma.helpContent.deleteMany();
  await prisma.park.deleteMany();
  console.log('✨ Cleared existing data');

  // ============================================================
  // Seed Motor Parks — 15 major Nigerian parks across key states
  // ============================================================
  const parks = await Promise.all([
    prisma.park.create({
      data: {
        name: 'Jabi Motor Park',
        address: 'Jabi, Abuja Municipal Area Council',
        city: 'Abuja',
        state: 'FCT',
        country: 'Nigeria',
        latitude: 9.0765,
        longitude: 7.4098,
        isActive: true,
      },
    }),
    prisma.park.create({
      data: {
        name: 'Utako Market Park',
        address: 'Utako District, Abuja',
        city: 'Abuja',
        state: 'FCT',
        country: 'Nigeria',
        latitude: 9.0820,
        longitude: 7.4700,
        isActive: true,
      },
    }),
    prisma.park.create({
      data: {
        name: 'Murtala Muhammed Way Park',
        address: 'Murtala Muhammed Way, Kano',
        city: 'Kano',
        state: 'Kano',
        country: 'Nigeria',
        latitude: 12.0022,
        longitude: 8.5920,
        isActive: true,
      },
    }),
    prisma.park.create({
      data: {
        name: 'Ojota Motor Park',
        address: 'Ojota, Lagos',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        latitude: 6.5960,
        longitude: 3.3980,
        isActive: true,
      },
    }),
    prisma.park.create({
      data: {
        name: 'Mile 2 Motor Park',
        address: 'Mile 2, Amuwo-Odofin, Lagos',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        latitude: 6.4698,
        longitude: 3.3004,
        isActive: true,
      },
    }),
    prisma.park.create({
      data: {
        name: 'Yola Motor Park',
        address: 'Jimeta, Yola North',
        city: 'Yola',
        state: 'Adamawa',
        country: 'Nigeria',
        latitude: 9.2035,
        longitude: 12.4954,
        isActive: true,
      },
    }),
    prisma.park.create({
      data: {
        name: 'Port Harcourt Mile 3 Motor Park',
        address: 'Mile 3, Diobu, Port Harcourt',
        city: 'Port Harcourt',
        state: 'Rivers',
        country: 'Nigeria',
        latitude: 4.8156,
        longitude: 7.0498,
        isActive: true,
      },
    }),
    prisma.park.create({
      data: {
        name: 'New Artisan Market Park',
        address: 'Artisan Market, Enugu',
        city: 'Enugu',
        state: 'Enugu',
        country: 'Nigeria',
        latitude: 6.4584,
        longitude: 7.5464,
        isActive: true,
      },
    }),
    prisma.park.create({
      data: {
        name: 'Iwo Road Motor Park',
        address: 'Iwo Road, Ibadan North',
        city: 'Ibadan',
        state: 'Oyo',
        country: 'Nigeria',
        latitude: 7.4137,
        longitude: 3.8989,
        isActive: true,
      },
    }),
    prisma.park.create({
      data: {
        name: 'Ring Road Motor Park',
        address: 'Ring Road, Benin City',
        city: 'Benin City',
        state: 'Edo',
        country: 'Nigeria',
        latitude: 6.3350,
        longitude: 5.6290,
        isActive: true,
      },
    }),
    prisma.park.create({
      data: {
        name: 'Berger Motor Park',
        address: 'Berger Bus Stop, Lagos-Ibadan Expressway',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        latitude: 6.6394,
        longitude: 3.3744,
        isActive: true,
      },
    }),
    prisma.park.create({
      data: {
        name: 'Kasuwar Barchi Motor Park',
        address: 'Kasuwar Barchi, Kano Municipal',
        city: 'Kano',
        state: 'Kano',
        country: 'Nigeria',
        latitude: 11.9960,
        longitude: 8.5189,
        isActive: true,
      },
    }),
    prisma.park.create({
      data: {
        name: 'Maza Maza Motor Park',
        address: 'Maza Maza, Amuwo-Odofin, Lagos',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        latitude: 6.4780,
        longitude: 3.2950,
        isActive: true,
      },
    }),
    prisma.park.create({
      data: {
        name: 'Trans-Ekulu Park',
        address: 'Trans-Ekulu, Enugu East',
        city: 'Enugu',
        state: 'Enugu',
        country: 'Nigeria',
        latitude: 6.4764,
        longitude: 7.5721,
        isActive: true,
      },
    }),
    prisma.park.create({
      data: {
        name: 'Wuse Zone 4 Park',
        address: 'Wuse Zone 4, Abuja',
        city: 'Abuja',
        state: 'FCT',
        country: 'Nigeria',
        latitude: 9.0579,
        longitude: 7.4951,
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${parks.length} motor parks`);

  // Seed Test Park Manager
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const managerUser = await prisma.user.upsert({
    where: { phoneNumber: '0808009213' },
    update: { password: hashedPassword, role: 'PARK_MANAGER' },
    create: {
      phoneNumber: '0808009213',
      email: 'manager@tyap.com',
      password: hashedPassword,
      role: 'PARK_MANAGER',
      isPhoneVerified: true,
      isEmailVerified: true,
    },
  });

  const ojotaPark = parks.find((p) => p.name === 'Ojota Motor Park') || parks[0];

  const managerProfile = await prisma.parkManager.upsert({
    where: { userId: managerUser.id },
    update: { parkId: ojotaPark.id },
    create: {
      userId: managerUser.id,
      firstName: 'Rufai',
      lastName: 'Shittu',
      parkId: ojotaPark.id,
      commissionRate: 5.0,
    },
  });

  // Seed Test Vehicle & Driver
  const driverUser = await prisma.user.upsert({
    where: { email: 'driver1@tyap.com' },
    update: { role: 'DRIVER' },
    create: {
      phoneNumber: '08012345678',
      email: 'driver1@tyap.com',
      password: hashedPassword,
      role: 'DRIVER',
      isPhoneVerified: true,
    },
  });

  await prisma.driver.create({
    data: {
      userId: driverUser.id,
      firstName: 'Rufai',
      lastName: 'Shittu',
      licenseNumber: 'FK3243UH',
      licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      shiftStatus: 'ON_SHIFT',
      vehicle: {
        create: {
          plateNumber: 'FKJ243UH',
          make: 'Toyota',
          model: 'HiAce',
          capacity: 14,
          currentParkId: ojotaPark.id,
          isActive: true,
          isAvailableForBoarding: true,
          vehicleType: 'BUS',
        },
      },
    },
  });

  console.log('✅ Created test Park Manager (0808009213 / password123) & Driver');

  // Seed FAQs
  const faqs = await Promise.all([
    // Account FAQs
    prisma.fAQ.create({
      data: {
        question: 'How do I create an account?',
        answer: 'To create an account, download the T-Yap app, tap "Sign Up", enter your email, phone number, and create a password. You will receive a verification code via email to complete the registration.',
        category: 'Account',
        tags: ['signup', 'registration', 'account'],
        order: 1,
      },
    }),
    prisma.fAQ.create({
      data: {
        question: 'I forgot my password. How do I reset it?',
        answer: 'On the login screen, tap "Forgot Password", enter your email or phone number, and you will receive a password reset code. Enter the code and create a new password.',
        category: 'Account',
        tags: ['password', 'reset', 'forgot'],
        order: 2,
      },
    }),
    prisma.fAQ.create({
      data: {
        question: 'How do I verify my email address?',
        answer: 'After signing up, check your email for a 6-digit verification code. Enter this code in the app to verify your email address.',
        category: 'Account',
        tags: ['verification', 'email'],
        order: 3,
      },
    }),

    // Wallet & Payment FAQs
    prisma.fAQ.create({
      data: {
        question: 'How do I add money to my wallet?',
        answer: 'Go to the Wallet section, tap "Top Up", enter the amount you want to add, and choose your payment method (card, bank transfer, or USSD). Follow the prompts to complete the payment.',
        category: 'Wallet & Payments',
        tags: ['wallet', 'topup', 'funding'],
        order: 1,
      },
    }),
    prisma.fAQ.create({
      data: {
        question: 'What payment methods are supported?',
        answer: 'We support debit/credit cards (Visa, Mastercard, Verve), bank transfers, and USSD codes from all major Nigerian banks.',
        category: 'Wallet & Payments',
        tags: ['payment', 'methods', 'cards'],
        order: 2,
      },
    }),
    prisma.fAQ.create({
      data: {
        question: 'Is my payment information secure?',
        answer: 'Yes! We use bank-level encryption and do not store your full card details. All transactions are processed through secure, PCI-compliant payment gateways.',
        category: 'Wallet & Payments',
        tags: ['security', 'payment', 'safe'],
        order: 3,
      },
    }),
    prisma.fAQ.create({
      data: {
        question: 'How long does it take for my wallet to be funded?',
        answer: 'Card payments are instant. Bank transfers may take 5-15 minutes to reflect in your wallet.',
        category: 'Wallet & Payments',
        tags: ['topup', 'duration', 'time'],
        order: 4,
      },
    }),

    // Transport FAQs
    prisma.fAQ.create({
      data: {
        question: 'How do I pay for my transport fare?',
        answer: 'Simply scan the QR code displayed in the vehicle or at the park. Your fare will be automatically deducted from your wallet balance.',
        category: 'Transport',
        tags: ['fare', 'payment', 'transport'],
        order: 1,
      },
    }),
    prisma.fAQ.create({
      data: {
        question: 'Can I see my trip history?',
        answer: 'Yes! Go to the Transactions section in your wallet to view all your past trips, including date, route, and amount paid.',
        category: 'Transport',
        tags: ['history', 'trips', 'transactions'],
        order: 2,
      },
    }),

    // Bills & Services FAQs
    prisma.fAQ.create({
      data: {
        question: 'What bills can I pay on T-Yap?',
        answer: 'You can pay for airtime, data bundles, electricity bills, and cable TV subscriptions (DStv, GOtv, Startimes) directly from the app.',
        category: 'Bills & Services',
        tags: ['bills', 'airtime', 'electricity', 'cable'],
        order: 1,
      },
    }),
    prisma.fAQ.create({
      data: {
        question: 'How do I buy airtime or data?',
        answer: 'Go to Services > Airtime/Data, select your network provider, enter the phone number and amount, then confirm the purchase. The airtime will be delivered instantly.',
        category: 'Bills & Services',
        tags: ['airtime', 'data', 'recharge'],
        order: 2,
      },
    }),

    // Technical FAQs
    prisma.fAQ.create({
      data: {
        question: 'The app is not working. What should I do?',
        answer: 'First, try closing and reopening the app. If the problem persists, check your internet connection. You can also clear the app cache in your phone settings or reinstall the app.',
        category: 'Technical',
        tags: ['app', 'crash', 'bug', 'technical'],
        order: 1,
      },
    }),
    prisma.fAQ.create({
      data: {
        question: 'I did not receive a notification for my transaction',
        answer: 'Check your notification settings in the app and make sure push notifications are enabled. You can also check your transaction history in the Wallet section.',
        category: 'Technical',
        tags: ['notifications', 'settings'],
        order: 2,
      },
    }),
  ]);

  console.log(`✅ Created ${faqs.length} FAQs`);

  // Seed Help Content
  const helpContent = await Promise.all([
    prisma.helpContent.create({
      data: {
        title: 'Getting Started with T-Yap',
        slug: 'getting-started',
        content: `Welcome to T-Yap! This guide will help you get started with your digital transport payment experience.

**Step 1: Create Your Account**
Download the T-Yap app from Google Play Store or Apple App Store. Sign up with your email and phone number.

**Step 2: Verify Your Account**
Check your email for a verification code and enter it in the app to verify your account.

**Step 3: Set Up Your Transaction PIN**
Create a 4-digit PIN that you'll use to authorize payments. Keep this secure!

**Step 4: Fund Your Wallet**
Add money to your wallet using your debit card, bank transfer, or USSD code.

**Step 5: Start Using T-Yap**
You're ready to pay for transport fares and bills seamlessly!`,
        category: 'Getting Started',
        tags: ['onboarding', 'tutorial', 'guide'],
        order: 1,
      },
    }),
    prisma.helpContent.create({
      data: {
        title: 'How to Fund Your Wallet',
        slug: 'fund-wallet',
        content: `Learn the different ways to add money to your T-Yap wallet.

**Method 1: Debit/Credit Card**
1. Go to Wallet > Top Up
2. Enter the amount
3. Select "Pay with Card"
4. Enter your card details
5. Confirm payment
Payment is instant!

**Method 2: Bank Transfer**
1. Go to Wallet > Top Up
2. Select "Bank Transfer"
3. Copy the account details provided
4. Make a transfer from your bank app
5. Your wallet will be credited within 5-15 minutes

**Method 3: USSD**
1. Go to Wallet > Top Up
2. Select "USSD"
3. Choose your bank
4. Dial the USSD code shown
5. Follow the prompts on your phone`,
        category: 'Wallet',
        tags: ['wallet', 'funding', 'topup'],
        order: 1,
      },
    }),
    prisma.helpContent.create({
      data: {
        title: 'Understanding Transaction PINs',
        slug: 'transaction-pin',
        content: `Your transaction PIN is a 4-digit code that secures all payments on T-Yap.

**Creating Your PIN**
After email verification, you'll be prompted to create a 4-digit PIN. Choose something memorable but secure—avoid obvious numbers like 1234 or your birth year.

**When You Need Your PIN**
You'll need to enter your PIN to:
- Make transport fare payments
- Buy airtime or data
- Pay bills
- Transfer money

**Forgot Your PIN?**
Go to Settings > Security > Reset Transaction PIN. You'll need to verify your identity via email before creating a new PIN.

**Security Tips**
- Never share your PIN with anyone
- Don't write it down in obvious places
- Change your PIN regularly
- Use a PIN that's different from your phone lock code`,
        category: 'Security',
        tags: ['pin', 'security', 'password'],
        order: 1,
      },
    }),
    prisma.helpContent.create({
      data: {
        title: 'Paying for Transport Fares',
        slug: 'pay-transport',
        content: `T-Yap makes paying for transport quick and contactless.

**At the Park**
1. When you board your vehicle, look for the T-Yap QR code
2. Open the T-Yap app and tap "Scan to Pay"
3. Scan the QR code
4. Confirm the fare amount shown
5. Enter your transaction PIN
6. Done! You'll receive a payment confirmation

**Benefits of Digital Payment**
- No need for cash
- Instant receipts
- Track all your trips
- Faster boarding process
- Safe and secure

**What If Something Goes Wrong?**
If your payment fails but money was deducted, don't worry! The amount will be refunded to your wallet within 24 hours. You can also contact support for immediate assistance.`,
        category: 'Transport',
        tags: ['fare', 'payment', 'qr', 'transport'],
        order: 1,
      },
    }),
    prisma.helpContent.create({
      data: {
        title: 'Buying Airtime and Data',
        slug: 'buy-airtime-data',
        content: `Recharge your phone or buy data bundles directly from T-Yap.

**For Airtime:**
1. Go to Services > Airtime
2. Select your network (MTN, Glo, Airtel, 9mobile)
3. Enter the phone number
4. Enter the amount (minimum ₦50)
5. Tap "Buy Airtime"
6. Confirm with your PIN
Airtime is delivered instantly!

**For Data Bundles:**
1. Go to Services > Data
2. Select your network
3. Choose your data plan
4. Enter the phone number
5. Confirm purchase with your PIN

**Tips:**
- You can save frequently used numbers as beneficiaries
- Data bundles are usually cheaper than buying airtime and converting
- Check your network's data plans for the best deals`,
        category: 'Bills & Services',
        tags: ['airtime', 'data', 'recharge'],
        order: 1,
      },
    }),
    prisma.helpContent.create({
      data: {
        title: 'Managing Notifications',
        slug: 'manage-notifications',
        content: `Stay informed about your transactions with T-Yap notifications.

**Types of Notifications:**
- Transaction confirmations
- Wallet funding alerts
- Low balance warnings
- Bill payment receipts
- Security alerts

**Customizing Your Preferences:**
1. Go to Settings > Notifications
2. Toggle notification types:
   - Push Notifications (in-app)
   - Email Notifications
   - SMS Notifications
3. Save your preferences

**Push Notifications:**
Get instant alerts on your phone. Make sure notifications are enabled in your phone settings.

**Email Notifications:**
Receive detailed receipts and summaries via email.

**SMS Notifications:**
Get text message alerts for important transactions (charges may apply).

**Troubleshooting:**
If you're not receiving notifications, check:
- App notification permissions in phone settings
- Internet connection
- Email spam/junk folder`,
        category: 'Settings',
        tags: ['notifications', 'alerts', 'settings'],
        order: 1,
      },
    }),
  ]);

  console.log(`✅ Created ${helpContent.length} help articles`);

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });