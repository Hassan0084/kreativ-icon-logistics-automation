import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const adminPassword = await bcrypt.hash('admin123', 12);
  const managerPassword = await bcrypt.hash('manager123', 12);

  // NOTE: passwords are only applied on CREATE. Re-running the seed will never
  // reset a password that has since been changed in the app.
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@kreativicon.com' },
      update: {},
      create: { name: 'Admin User', email: 'admin@kreativicon.com', password: adminPassword, role: 'ADMIN' },
    }),
    prisma.user.upsert({
      where: { email: 'manager@kreativicon.com' },
      update: {},
      create: { name: 'Sarah Manager', email: 'manager@kreativicon.com', password: managerPassword, role: 'MANAGER' },
    }),
    prisma.user.upsert({
      where: { email: 'ops@kreativicon.com' },
      update: {},
      create: { name: 'Ahmed Operations', email: 'ops@kreativicon.com', password: await bcrypt.hash('ops123', 12), role: 'OPERATIONS' },
    }),
    prisma.user.upsert({
      where: { email: 'sales@kreativicon.com' },
      update: {},
      create: { name: 'Fatima Sales', email: 'sales@kreativicon.com', password: await bcrypt.hash('sales123', 12), role: 'SALES' },
    }),
    prisma.user.upsert({
      where: { email: 'finance@kreativicon.com' },
      update: {},
      create: { name: 'Omar Finance', email: 'finance@kreativicon.com', password: await bcrypt.hash('finance123', 12), role: 'FINANCE' },
    }),
  ]);
  console.log(`✅ Created ${users.length} users`);

  const carriers = await Promise.all([
    prisma.carrier.upsert({ where: { id: 'carrier-1' }, update: {}, create: { id: 'carrier-1', companyName: 'Emirates Air Cargo', carrierType: 'AIRLINE', country: 'UAE', iataCode: 'EK' } as any }),
    prisma.carrier.upsert({ where: { id: 'carrier-2' }, update: {}, create: { id: 'carrier-2', companyName: 'COSCO Shipping', carrierType: 'SHIPPING_LINE', country: 'China', scacCode: 'COSU' } as any }),
    prisma.carrier.upsert({ where: { id: 'carrier-3' }, update: {}, create: { id: 'carrier-3', companyName: 'Saudi Ground Transport', carrierType: 'TRUCKING_COMPANY', country: 'Saudi Arabia' } as any }),
  ]);
  console.log(`✅ Created ${carriers.length} carriers`);

  const suppliers = await Promise.all([
    prisma.supplier.upsert({ where: { id: 'supplier-1' }, update: {}, create: { id: 'supplier-1', companyName: 'Shanghai Trade Co.', country: 'China', services: 'Manufacturing, Export' } as any }),
    prisma.supplier.upsert({ where: { id: 'supplier-2' }, update: {}, create: { id: 'supplier-2', companyName: 'Dubai Freight Partners', country: 'UAE', services: 'Freight, Consolidation' } as any }),
  ]);
  console.log(`✅ Created ${suppliers.length} suppliers`);

  // External supplier logins. Each is bound to a Supplier record so uploads are
  // scoped to that supplier and cannot be redirected to another.
  const supplierUser = await prisma.user.upsert({
    where: { email: 'supplier@kreativicon.com' },
    update: {},
    create: {
      name: 'Li Wei',
      email: 'supplier@kreativicon.com',
      password: await bcrypt.hash('supplier123', 12),
      role: 'SUPPLIER',
      supplierId: 'supplier-1',
    },
  });
  console.log('✅ Created supplier login(supplier@kreativicon.com)');

  const customerData = [
    { id: 'cust-1', customerId: 'CUS-0001', companyName: 'Al Rajhi Trading Co.', contactPerson: 'Mohammed Al Rajhi', email: 'info@alrajhi-trade.com', phone: '+966501234567', country: 'Saudi Arabia', city: 'Riyadh', customerType: 'CORPORATE', paymentTerms: 'NET_30' },
    { id: 'cust-2', customerId: 'CUS-0002', companyName: 'Sabic Industrial', contactPerson: 'Ali Hassan', email: 'logistics@sabic-ind.com', phone: '+966512345678', country: 'Saudi Arabia', city: 'Dhahran', customerType: 'CORPORATE', paymentTerms: 'NET_45' },
    { id: 'cust-3', customerId: 'CUS-0003', companyName: 'Gulf Electronics LLC', contactPerson: 'Khalid Bin Omar', email: 'supply@gulf-elec.ae', phone: '+971501234567', country: 'UAE', city: 'Dubai', customerType: 'CORPORATE', paymentTerms: 'NET_30' },
    { id: 'cust-4', customerId: 'CUS-0004', companyName: 'Riyadh Medical Supplies', contactPerson: 'Dr. Aisha Al Saud', email: 'orders@rms.sa', phone: '+966523456789', country: 'Saudi Arabia', city: 'Riyadh', customerType: 'CORPORATE', paymentTerms: 'NET_15' },
    { id: 'cust-5', customerId: 'CUS-0005', companyName: 'India Textile Imports', contactPerson: 'Raj Patel', email: 'raj@indiatextile.in', phone: '+919876543210', country: 'India', city: 'Mumbai', customerType: 'INDIVIDUAL', paymentTerms: 'ADVANCE' },
  ];
  const customers = await Promise.all(customerData.map(c => prisma.customer.upsert({ where: { id: c.id }, update: {}, create: c as any })));
  console.log(`✅ Created ${customers.length} customers`);

  const now = new Date();
  const shipmentData = [
    { id: 'ship-1', shipmentNumber: 'KIC-20260914-0001', customerId: 'cust-1', carrierId: 'carrier-1', serviceType: 'AIR_FREIGHT', shipmentType: 'IMPORT', origin: 'Dubai, UAE', destination: 'Riyadh, KSA', awbBlNumber: 'EK-123456789', cargoDescription: 'Electronic Components', weight: 450, volume: 2.8, freightCost: 3200, sellingPrice: 4500, profit: 1300, profitMargin: 28.9, status: 'DELIVERED', eta: new Date(now.getTime() - 10 * 86400000), actualDeliveryDate: new Date(now.getTime() - 9 * 86400000) },
    { id: 'ship-2', shipmentNumber: 'KIC-20260914-0002', customerId: 'cust-2', carrierId: 'carrier-2', supplierId: 'supplier-1', serviceType: 'SEA_FREIGHT_FCL', shipmentType: 'IMPORT', origin: 'Shanghai, China', destination: 'Jeddah, KSA', containerNumber: 'COSU7654321', cargoDescription: 'Industrial Machinery', weight: 12500, volume: 28, freightCost: 8500, sellingPrice: 11200, profit: 2700, profitMargin: 24.1, status: 'IN_TRANSIT', eta: new Date(now.getTime() + 15 * 86400000) },
    { id: 'ship-3', shipmentNumber: 'KIC-20260914-0003', customerId: 'cust-3', carrierId: 'carrier-3', serviceType: 'LAND_FREIGHT', shipmentType: 'TRANSIT', origin: 'Riyadh, KSA', destination: 'Jeddah, KSA', cargoDescription: 'Consumer Goods', weight: 3200, volume: 18, freightCost: 1800, sellingPrice: 2800, profit: 1000, profitMargin: 35.7, status: 'OUT_FOR_DELIVERY', eta: new Date(now.getTime() + 1 * 86400000) },
    { id: 'ship-4', shipmentNumber: 'KIC-20260914-0004', customerId: 'cust-4', carrierId: 'carrier-1', serviceType: 'AIR_FREIGHT', shipmentType: 'IMPORT', origin: 'Frankfurt, Germany', destination: 'Riyadh, KSA', awbBlNumber: 'LH-987654321', cargoDescription: 'Medical Equipment', cargoType: 'FRAGILE', weight: 280, volume: 1.5, freightCost: 5600, sellingPrice: 7800, profit: 2200, profitMargin: 28.2, status: 'CUSTOMS_HOLD', eta: new Date(now.getTime() - 2 * 86400000) },
    { id: 'ship-5', shipmentNumber: 'KIC-20260914-0005', customerId: 'cust-5', serviceType: 'SEA_FREIGHT_LCL', shipmentType: 'EXPORT', origin: 'Mumbai, India', destination: 'Jeddah, KSA', cargoDescription: 'Textile Fabric Rolls', weight: 8700, volume: 45, freightCost: 4200, sellingPrice: 5800, profit: 1600, profitMargin: 27.6, status: 'BOOKED', eta: new Date(now.getTime() + 25 * 86400000) },
  ];
  const shipments = await Promise.all(shipmentData.map(s => prisma.shipment.upsert({ where: { id: s.id }, update: {}, create: s as any })));
  console.log(`✅ Created ${shipments.length} shipments`);

  await prisma.shipmentStatusHistory.createMany({
    data: [
      { shipmentId: 'ship-1', status: 'BOOKED', notes: 'Shipment booked', updatedById: users[0].id, createdAt: new Date(now.getTime() - 20 * 86400000) },
      { shipmentId: 'ship-1', status: 'PICKED_UP', notes: 'Cargo collected from shipper', updatedById: users[0].id, createdAt: new Date(now.getTime() - 18 * 86400000) },
      { shipmentId: 'ship-1', status: 'IN_TRANSIT', notes: 'Departed Dubai', location: 'Dubai, UAE', updatedById: users[0].id, createdAt: new Date(now.getTime() - 15 * 86400000) },
      { shipmentId: 'ship-1', status: 'DELIVERED', notes: 'Delivered to customer', location: 'Riyadh, KSA', updatedById: users[0].id, createdAt: new Date(now.getTime() - 9 * 86400000) },
      { shipmentId: 'ship-2', status: 'BOOKED', notes: 'Booking confirmed with COSCO', updatedById: users[0].id, createdAt: new Date(now.getTime() - 15 * 86400000) },
      { shipmentId: 'ship-2', status: 'IN_TRANSIT', notes: 'Vessel departed Shanghai', location: 'South China Sea', updatedById: users[0].id, createdAt: new Date(now.getTime() - 8 * 86400000) },
    ],
  });

  await Promise.all([
    prisma.quotation.upsert({ where: { id: 'quot-1' }, update: {}, create: { id: 'quot-1', quotationNumber: 'QT-202609-0001', customerId: 'cust-1', origin: 'Dubai, UAE', destination: 'Riyadh, KSA', serviceType: 'AIR_FREIGHT', freightCharges: 4500, customsCharges: 800, handlingCharges: 350, subtotal: 5650, vatRate: 15, vatAmount: 847.5, grandTotal: 6497.5, status: 'ACCEPTED', validUntil: new Date(now.getTime() + 30 * 86400000) } }),
    prisma.quotation.upsert({ where: { id: 'quot-2' }, update: {}, create: { id: 'quot-2', quotationNumber: 'QT-202609-0002', customerId: 'cust-3', origin: 'Shanghai, China', destination: 'Dubai, UAE', serviceType: 'SEA_FREIGHT_FCL', freightCharges: 3200, customsCharges: 600, handlingCharges: 250, subtotal: 4050, vatRate: 15, vatAmount: 607.5, grandTotal: 4657.5, status: 'SENT', validUntil: new Date(now.getTime() + 15 * 86400000) } }),
  ]);

  await Promise.all([
    prisma.invoice.upsert({ where: { id: 'inv-1' }, update: {}, create: { id: 'inv-1', invoiceNumber: 'INV-202609-0001', customerId: 'cust-1', shipmentId: 'ship-1', subtotal: 4500, vatRate: 15, vatAmount: 675, grandTotal: 5175, paidAmount: 5175, balance: 0, status: 'PAID', dueDate: new Date(now.getTime() + 30 * 86400000), paidAt: new Date(now.getTime() - 5 * 86400000) } }),
    prisma.invoice.upsert({ where: { id: 'inv-2' }, update: {}, create: { id: 'inv-2', invoiceNumber: 'INV-202609-0002', customerId: 'cust-2', shipmentId: 'ship-2', subtotal: 11200, vatRate: 15, vatAmount: 1680, grandTotal: 12880, paidAmount: 6440, balance: 6440, status: 'PARTIALLY_PAID', dueDate: new Date(now.getTime() + 15 * 86400000) } }),
  ]);

  console.log('\n🎉 Database seeded successfully!');
  console.log('📋 Demo Credentials:');
  console.log('   Admin     admin@kreativicon.com     / admin123');
  console.log('   Manager   manager@kreativicon.com   / manager123');
  console.log('   Supplier  supplier@kreativicon.com  / supplier123   (supplier portal)');
  console.log(`   Supplier record: ${supplierUser.supplierId}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
