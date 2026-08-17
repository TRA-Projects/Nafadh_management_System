import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// import { CompanyService } from '../../services/company.service'; // تأكد من تعديل مسار الخدمة حسب مشروعك

interface Company {
  companyName: string;
  initials: string;
  workField: string;
  address: string;
  phone: string;
  email: string;
  capacity: number;
  currentLoad: number;
  rating: number | null;
  status: string;
  statusText: string;
}

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './companies.html',
  styleUrls: ['./companies.css']
})
export class AdminCompanies implements OnInit {
  currentFilter: string = 'all';
  isAddModalOpen: boolean = false;
  emailError: boolean = false;

  availableFields: string[] = [
    'تقنية المعلومات',
    'اتصالات',
    'خدمات رقمية',
    'برمجيات',
    'بنية تحتية',
    'ذكاء اصطناعي'
  ];

  newCompany = {
    name: '',
    field: 'برمجيات',
    city: 'مسقط',
    maxCapacity: 200,
    statusText: 'معتمدة',
    contactName: '',
    email: '',
    phone: ''
  };

  allCompanies: Company[] = [];
  companiesList: Company[] = [];

  // قم بفك التعليق هنا لحقن الـ Service الخاصة بك
  // constructor(private companyService: CompanyService) {}

  ngOnInit() {
    this.loadCompanies();
  }

  // جلب البيانات من قاعدة البيانات عبر الـ API
  loadCompanies() {

  }

  filterStatus(status: string) {
    this.currentFilter = status;
    if (status === 'all') {
      this.companiesList = [...this.allCompanies];
    } else {
      this.companiesList = this.allCompanies.filter(company => company.status === status);
    }
  }

  addNewCompany() {
    this.isAddModalOpen = true;
    this.emailError = false;
  }

  closeModal() {
    this.isAddModalOpen = false;
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  // دالة الإرسال والحفظ الفعلي في الداتابيس عبر الـ Backend
  submitNewCompany() {
    if (!this.newCompany.name) {
      alert('يرجى إدخال اسم الشركة');
      return;
    }

    if (this.newCompany.email && !this.validateEmail(this.newCompany.email)) {
      this.emailError = true;
      return;
    } else {
      this.emailError = false;
    }

    // تجهيز البيانات بالهيكل المطابق لـ NFD_CompanyInputDTO في الـ C# Backend
    const companyInputDTO = {
      companyName: this.newCompany.name,
      commercialRegister: 'CR-' + Math.floor(10000 + Math.random() * 90000), // رقم سجل تجاري افتراضي أو أضه كحقل
      workField: this.newCompany.field,
      address: this.newCompany.city,
      phone: this.newCompany.phone,
      email: this.newCompany.email,
      logo: 'https://cdn.nafadh.test/logos/default.png',
      capacity: Number(this.newCompany.maxCapacity),
      status: 1, // 1 يمثل الحالة في الـ Backend Enum
      userId: 1  // معرف المستخدم (تأكد أنه موجود في جدول Users بالداتابيس)
    };

  
    
    // مؤقتاً للتجربة المحلية لحين تفعيل الـ Service:
    let statusKey = 'approved';
    if (this.newCompany.statusText === 'قيد المراجعة') statusKey = 'pending';
    if (this.newCompany.statusText === 'موقوفة') statusKey = 'rejected';

    const companyToAdd: Company = {
      companyName: this.newCompany.name,
      initials: this.newCompany.name.slice(0, 2),
      workField: this.newCompany.field,
      address: this.newCompany.city,
      phone: this.newCompany.phone,
      email: this.newCompany.email,
      capacity: Number(this.newCompany.maxCapacity),
      currentLoad: 0,
      rating: null,
      status: statusKey,
      statusText: this.newCompany.statusText
    };

    this.allCompanies.unshift(companyToAdd);
    this.filterStatus(this.currentFilter);
    this.closeModal();
    this.resetForm();
  }

  resetForm() {
    this.newCompany = {
      name: '',
      field: 'برمجيات',
      city: 'مسقط',
      maxCapacity: 0,
      statusText: 'قيد المراجعة',
      contactName: '',
      email: '',
      phone: ''
    };
  }

  viewCompany(company: any) { console.log('عرض:', company.companyName); }
  editCompany(company: any) { console.log('تعديل:', company.companyName); }
}