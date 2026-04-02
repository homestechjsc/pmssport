window.ui = {
    // 1. CHUYỂN TAB VÀ KÍCH HOẠT VẼ DỮ LIỆU
    switchTab: (id) => {
    // 1. Ẩn hiện tab và xử lý class hidden của Tailwind
    document.querySelectorAll('.tab-content').forEach(t => {
        t.classList.remove('active');
        t.classList.add('hidden');
    });
    
    const targetTab = document.getElementById('tab-' + id);
    if (targetTab) {
        targetTab.classList.add('active');
        targetTab.classList.remove('hidden');
    }

    // 2. Đổi màu nút bấm Menu
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const targetBtn = document.getElementById('btn-' + id);
    if (targetBtn) targetBtn.classList.add('active');

    // 3. KÍCH HOẠT VẼ LẠI DỮ LIỆU CHO TỪNG TAB
    if (!window.app) return;

    // Tab Bán lẻ
    if (id === 'pos') {
        if (typeof window.app.renderPosProducts === 'function') window.app.renderPosProducts();
    }

    // Tab Dịch vụ
    if (id === 'service') {
        if (typeof window.app.renderServicesTable === 'function') window.app.renderServicesTable();
    }

    if (tabId === 'all-customers') {
    app.renderAllCustomers();
    }
    // Tab Nhà cung cấp
    if (id === 'suppliers') {
        if (typeof window.app.renderSupplierTable === 'function') {
            window.app.renderSupplierTable();
            // Phòng hờ mạng chậm, thử lại sau 300ms
            setTimeout(() => window.app.renderSupplierTable(), 300);
        }
    }

    // Tab Sân
    if (id === 'court') {
        if (typeof window.app.renderCourtsTable === 'function') window.app.renderCourtsTable();
    }

    // Tab Báo cáo
    if (id === 'reports') {
        const dateTo = new Date().toISOString().split('T')[0];
        const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        if (document.getElementById('report-date-from')) document.getElementById('report-date-from').value = dateFrom;
        if (document.getElementById('report-date-to')) document.getElementById('report-date-to').value = dateTo;

        if (typeof window.app.loadReports === 'function') window.app.loadReports();
    }

    // Tab Nhập kho
    if (id === 'stock') {
        if (typeof window.app.renderStockTable === 'function') window.app.renderStockTable();
    }

    // Tab Hóa đơn
    if (id === 'bill') {
    if (typeof window.app.renderBills === 'function') {
        window.app.renderBills(); // Hàm này giờ đã có logic check isAdmin ở Bước 1
    }
}

    // --- MỚI BỔ SUNG: Tab Quản lý tài khoản nhân viên ---
    if (id === 'staff') {
        console.log("Kích hoạt Tab Nhân viên...");
        if (typeof window.app.renderStaffTable === 'function') window.app.renderStaffTable();
    }
},

    // 2. QUẢN LÝ MODAL (MỞ/ĐÓNG)
    openModal: (type, id = null, data = null) => {
    console.log("Mở modal:", type);

    // 1. XỬ LÝ DỮ LIỆU ĐẶC THÙ TRƯỚC KHI HIỆN
    if (type === 'booking') {
        const todayStr = new Date().toISOString().split('T')[0];
        const bDateInput = document.getElementById('b-date');
        if (bDateInput) {
            bDateInput.setAttribute('min', todayStr);
            const viewDate = document.getElementById('view-date')?.value;
            bDateInput.value = viewDate || todayStr;
        }

        // --- CẬP NHẬT MỚI: Reset form đặt lịch gộp chung ---
        const fields = ['b-name', 'b-phone', 'b-cust-id', 'b-note', 'b-deposit'];
        fields.forEach(fieldId => {
            const el = document.getElementById(fieldId);
            if (el) el.value = ""; 
        });

        // Reset phần lịch lặp
        const repeatCheck = document.getElementById('b-repeat');
        if (repeatCheck) {
            repeatCheck.checked = false;
            const opt = document.getElementById('repeat-options');
            if (opt) opt.classList.add('hidden');
        }

        // Xóa các gợi ý cũ nếu còn sót lại
        const suggestBox = document.getElementById('booking-cust-suggestions');
        if (suggestBox) suggestBox.classList.add('hidden');
        
        // KHÔNG gọi window.ui.toggleBookingType() nữa vì đã gộp làm 1
    } 

    else if (type === 'manage-booking') {
    window.currentBooking = { id: id, ...data };
    
    document.getElementById('manage-b-id').value = id;
    document.getElementById('manage-b-id-display').innerText = id;

    // 1. Nạp danh sách sân vào ô Select
    const courtSelect = document.getElementById('manage-b-court-id');
    if (courtSelect) {
        const courts = window.dataCache.courts || {};
        let html = '';
        Object.entries(courts).forEach(([cid, c]) => {
            html += `<option value="${cid}">${c.Ten_San || cid}</option>`;
        });
        courtSelect.innerHTML = html;
        courtSelect.value = data?.Court_ID || "";
    }

    // 2. Nạp dữ liệu vào các ô nhập liệu
    document.getElementById('manage-b-name').value = data?.Ten_Khach || "";
    document.getElementById('manage-b-phone').value = data?.SDT || "";
    document.getElementById('manage-b-start').value = data?.Bat_Dau || "";
    document.getElementById('manage-b-end').value = data?.Ket_Thuc || "";
    document.getElementById('manage-b-date').value = data?.Ngay || "";
    document.getElementById('manage-b-deposit').value = data?.Tien_Coc || 0;
    document.getElementById('manage-b-note').value = data?.Ghi_Chu || "";
}

    else if (type === 'court') {
        const cId = document.getElementById('court-id');
        const cName = document.getElementById('c-name');
        if (cId) cId.value = id || "";
        if (cName) cName.value = data?.Ten_San || "";
        
        if (window.app.renderCourtTypes) window.app.renderCourtTypes();
        setTimeout(() => {
            const selectType = document.getElementById('c-type');
            if (selectType) selectType.value = data?.Loai_San || "";
        }, 100);
    }

    else if (type === 'service') {
        const sId = document.getElementById('service-id');
        if (sId) sId.value = id || "";

        let d = data || (id ? window.dataCache?.services?.[id] : null);

        const sName = document.getElementById('s-name');
        const sPrice = document.getElementById('s-price');
        const sStock = document.getElementById('s-stock');
        const sImg = document.getElementById('s-img');

        if (sName) sName.value = d?.Ten_Dich_Vu || "";
        if (sPrice) sPrice.value = d?.Gia_Ban || 0;
        if (sStock) sStock.value = d?.Ton_Kho || 0;
        if (sImg) sImg.value = d?.Hinh_Anh || "";

        if (window.app.renderServiceCategories) window.app.renderServiceCategories();
        
        setTimeout(() => {
            const catSelect = document.getElementById('s-category');
            if (catSelect) catSelect.value = d?.Loai_DV || "";
        }, 100);
    }

    else if (type === 'customer') {
        const idInp = document.getElementById('cust-id');
        const viewIdInp = document.getElementById('view-cust-id');
        const nameInp = document.getElementById('cust-name');
        const phoneInp = document.getElementById('cust-phone');
        const groupId = document.getElementById('group-cust-id');

        if (id) {
            if (groupId) groupId.classList.remove('hidden');
            if (idInp) idInp.value = id;
            if (viewIdInp) viewIdInp.value = id;
            if (nameInp) nameInp.value = data?.Name || "";
            if (phoneInp) phoneInp.value = data?.Phone || data?.SDT || "";
        } else {
            if (groupId) groupId.classList.add('hidden');
            if (idInp) idInp.value = "";
            if (viewIdInp) viewIdInp.value = "";
            if (nameInp) nameInp.value = "";
            if (phoneInp) phoneInp.value = "";
        }
    }

    else if (type === 'member') {
        const mId = document.getElementById('member-id');
        const mName = document.getElementById('m-name');
        const mPhone = document.getElementById('m-phone');
        const mWallet = document.getElementById('m-wallet');

        if (mId) mId.value = id || "";
        if (mName) mName.value = data?.Ten_HV || "";
        if (mPhone) mPhone.value = data?.SDT || "";
        if (mWallet) mWallet.value = data?.Vi_Du || 0;
    }

    else if (type === 'recharge') {
        const rId = document.getElementById('recharge-member-id');
        const rName = document.getElementById('recharge-member-name');
        const rAmt = document.getElementById('recharge-amount');

        if (rId) rId.value = id;
        if (rName) rName.innerText = "Hội viên: " + (data?.Ten_HV || "");
        if (rAmt) rAmt.value = "";
    }

    // 2. HIỂN THỊ MODAL (Thay thế đoạn cuối hàm openModal của bạn)
const modalEl = document.getElementById('modal-' + type);
if (modalEl) {
    // Gỡ bỏ hoàn toàn các class ẩn của Tailwind
    modalEl.classList.remove('hidden');
    
    // Thêm class active và ép style trực tiếp để đảm bảo nó nằm trên cùng
    modalEl.classList.add('active');
    modalEl.style.display = 'flex'; 
    modalEl.style.zIndex = '9999'; 
    
    console.log("🚀 Đã thực thi lệnh hiển thị cho modal: " + type);
} else {
    console.error("❌ Không tìm thấy phần tử HTML: modal-" + type);
}},

    applyPermissions: (role) => {
        // 1. Mặc định ẩn tất cả các phần tử có đánh dấu phân quyền
        const allProtected = document.querySelectorAll('.admin-only, .quanly-only, .thungan-only');
        allProtected.forEach(el => el.classList.add('hidden'));

        // 2. Mở khóa dựa trên vai trò thực tế
        if (role === 'Admin') {
            // Admin có quyền tối cao
            allProtected.forEach(el => el.classList.remove('hidden'));
        } 
        else if (role === 'Quanly') {
            // Quản lý thấy phần của Quản lý và Thu ngân
            document.querySelectorAll('.quanly-only, .thungan-only').forEach(el => el.classList.remove('hidden'));
        } 
        else {
            // Thu ngân (Staff) chỉ thấy phần dành riêng cho mình
            document.querySelectorAll('.thungan-only').forEach(el => el.classList.remove('hidden'));
        }
        
        console.log(`🔐 Phân quyền: Đã áp dụng giao diện cho ${role}`);
    },

    closeModal: (type) => {
    const modalEl = document.getElementById('modal-' + type);
    if (modalEl) {
        // 1. Thêm lại class ẩn của Tailwind
        modalEl.classList.add('hidden');
        
        // 2. Xóa class active (nếu bạn dùng để chạy hiệu ứng fade-out)
        modalEl.classList.remove('active');
        
        // 3. Ép kiểu hiển thị về none để chắc chắn không bị đè bởi class khác
        modalEl.style.display = 'none';
        
        console.log("Đã đóng modal: " + type);
    }
},

    // 3. LOGIC NGHIỆP VỤ GIAO DIỆN (CHECK-IN, BOOKING, POS)
    toggleCheckinMode: () => {
        const mode = document.getElementById('checkin-mode').value;
        document.getElementById('checkin-walkin-box').classList.toggle('hidden', mode !== 'walk-in');
        document.getElementById('checkin-member-box').classList.toggle('hidden', mode !== 'member');
    },

    toggleBookingType: () => {
        const radio = document.querySelector('input[name="b-customer-type"]:checked');
        if (!radio) return;
        const type = radio.value;
        const nameCont = document.getElementById('b-name-container');
        const membCont = document.getElementById('b-member-container');
        
        if (type === 'Hội viên') {
            nameCont?.classList.add('hidden');
            membCont?.classList.remove('hidden');
            let listHtml = '';
            for (let id in window.dataCache.members) {
                const m = window.dataCache.members[id];
                listHtml += `<option value="${m.Ten_HV}" data-id="${id}">${m.SDT}</option>`;
            }
            const listEl = document.getElementById('b-member-list');
            if (listEl) listEl.innerHTML = listHtml;
        } else {
            nameCont?.classList.remove('hidden');
            membCont?.classList.add('hidden');
        }
    },

    onSearchMemberBooking: (el) => {
        const val = el.value.trim().toLowerCase();
        const list = document.getElementById('b-member-list');
        const phoneInput = document.getElementById('b-phone');
        const idInput = document.getElementById('b-member-id');
        const members = window.dataCache?.members;
        if (!list || !members) return;

        let html = '';
        Object.entries(members).forEach(([id, m]) => {
            const ten = m.Ten_HV || "Không tên"; 
            const sdt = m.SDT || "";
            if (val === "" || ten.toLowerCase().includes(val) || sdt.includes(val)) {
                html += `<option value="${ten}">SĐT: ${sdt}</option>`;
            }
        });
        list.innerHTML = html;

        const foundMember = Object.entries(members).find(([id, m]) => (m.Ten_HV && m.Ten_HV === el.value.trim()));
        if (foundMember) {
            idInput.value = foundMember[0];
            phoneInput.value = foundMember[1].SDT || '';
        } else {
            idInput.value = '';
        }
    },

    // Thêm vào window.ui
toggleStockPaymentFields: () => {
    const status = document.getElementById('stk-status').value;
    const wrap = document.getElementById('stk-payment-method-wrap');
    if (status === 'Đã thanh toán') {
        wrap.classList.remove('hidden');
    } else {
        wrap.classList.add('hidden');
    }
},

// Hàm xử lý đóng/mở menu dropdown
   toggleDropdown: (event, id) => {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const target = document.getElementById(id);
    if (!target) return;

    // 1. Đóng các dropdown khác
    const dropdowns = ['dropdown-manage', 'dropdown-user'];
    dropdowns.forEach(dId => {
        if (dId !== id) {
            const el = document.getElementById(dId);
            if (el) el.classList.add('hidden');
        }
    });

    // 2. Bật/Tắt menu hiện tại
    target.classList.toggle('hidden');

    // 3. TỰ ĐỘNG ẨN KHI RÊ CHUỘT RA NGOÀI (Bổ sung mới)
    // Nếu menu đang hiển thị, gắn sự kiện lắng nghe chuột rời đi
    if (!target.classList.contains('hidden')) {
        target.onmouseleave = () => {
            target.classList.add('hidden');
        };
        
        // Gắn thêm cho cả nút bấm để nếu chuột rời cả nút lẫn menu thì ẩn
        const parent = target.closest('.relative');
        if (parent) {
            parent.onmouseleave = () => {
                target.classList.add('hidden');
            };
        }
    }
},


    toggleAddService: () => {
        const box = document.getElementById('add-service-box');
        const select = document.getElementById('add-service-id');
        if (!box || !select) return;
        box.classList.toggle('hidden');
        if (!box.classList.contains('hidden')) {
            const services = window.dataCache.services || {};
            let html = '<option value="">-- Chọn món --</option>';
            Object.entries(services).forEach(([id, item]) => {
                html += `<option value="${id}">${item.Ten_Dich_Vu} (${Number(item.Gia_Ban).toLocaleString()}đ)</option>`;
            });
            select.innerHTML = html;
        }
    },

   clickTimeline: (courtId, hour) => {
    const viewDateValue = document.getElementById('view-date')?.value;
    if (!viewDateValue) return;

    const now = new Date();
    const viewDate = new Date(viewDateValue);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(viewDate);
    compareDate.setHours(0, 0, 0, 0);

    // 1. Chặn giờ quá khứ
    if (compareDate < today) {
        alert("⚠️ Không thể đặt sân cho những ngày đã qua!");
        return;
    }

    const isToday = now.toDateString() === viewDate.toDateString();
    if (isToday && hour < now.getHours()) {
        const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        alert(`⚠️ Không thể đặt lịch vào khung giờ đã qua! (Giờ hiện tại là ${currentTimeStr})`);
        return; 
    }

    // 2. MỞ MODAL (Sử dụng cả class và ép Style để chắc chắn hiển thị)
    const modalEl = document.getElementById('modal-booking');
    if (modalEl) {
        modalEl.classList.add('active'); 
        modalEl.style.display = 'flex'; // Ép hiển thị flex để đè lên display: none
    } else {
        window.ui?.openModal('booking');
    }

    // 3. ĐIỀN DỮ LIỆU (setTimeout để đợi Modal render xong)
    setTimeout(() => {
        // Reset các ô ID ẩn và thông tin cũ để tránh râu ông nọ cắm cằm bà kia
        const elCustId = document.getElementById('b-cust-id');
        const elName = document.getElementById('b-name');
        const elPhone = document.getElementById('b-phone');
        if (elCustId) elCustId.value = "";
        if (elName) elName.value = "";
        if (elPhone) elPhone.value = "";

        const elDate = document.getElementById('b-date');
        const elCourtSelect = document.getElementById('b-court-id');
        const elStart = document.getElementById('b-start');
        const elEnd = document.getElementById('b-end');

        // Nạp danh sách sân
        if (elCourtSelect) {
            const courts = window.dataCache.courts || {};
            let html = '<option value="">-- Chọn sân --</option>';
            Object.entries(courts).forEach(([id, c]) => {
                html += `<option value="${id}">${c.Ten_San || id}</option>`;
            });
            elCourtSelect.innerHTML = html;
            elCourtSelect.value = courtId; 
        }

        if (elDate) elDate.value = viewDateValue;
        
        const startTime = `${hour.toString().padStart(2, '0')}:00`;
        const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
        
        if (elStart) elStart.value = startTime;
        if (elEnd) elEnd.value = endTime;

        console.log(`✅ Đã hiển thị Form đặt sân: ${courtId} lúc ${startTime}`);
    }, 100); 
},
// --- BỔ SUNG LOGIC GIẢM GIÁ 2 Ô SONG SONG ---
    handleDiscountInput: (type) => {
        // 1. Lấy tổng tiền gốc (sau khi đã trừ giảm hạng hội viên và cọc, nhưng trước khi giảm tay)
        const baseTotal = Number(document.getElementById('base-total-without-manual').value || 0);
        const inputCash = document.getElementById('manual-discount-cash');
        const inputPercent = document.getElementById('manual-discount-percent');

        if (!inputCash || !inputPercent) return;

        if (type === 'cash') {
            // Nếu người dùng nhập số tiền -> Tính ra % tương ứng
            const cashValue = Number(inputCash.value || 0);
            const calculatedPercent = baseTotal > 0 ? (cashValue / baseTotal) * 100 : 0;
            // Hiển thị 1 chữ số thập phân cho %
            inputPercent.value = cashValue > 0 ? calculatedPercent.toFixed(1) : "";
        } else {
            // Nếu người dùng nhập % -> Tính ra số tiền mặt tương ứng
            const percentValue = Number(inputPercent.value || 0);
            const calculatedCash = (percentValue * baseTotal) / 100;
            // Làm tròn tiền mặt
            inputCash.value = percentValue > 0 ? Math.round(calculatedCash) : "";
        }

        // 2. Gọi hàm tính toán lại tổng cuối cùng
        window.ui.recalculateWithDiscount();
    },

    recalculateWithDiscount: () => {
        const baseTotal = Number(document.getElementById('base-total-without-manual').value || 0);
        const discountCash = Number(document.getElementById('manual-discount-cash').value || 0);
        const deposit = Number(window.dataCache.courts[window.selectedCourtId]?.Da_Coc || 0);
        
        // Tính tiền cuối cùng = (Tổng sau giảm hạng) - (Giảm giá tay) - (Tiền cọc nếu chưa trừ)
        // Lưu ý: Trong hàm openCheckout của bạn, base-total-without-manual thường đã bao gồm tiền cọc
        // nên ta chỉ cần trừ đi discountCash.
        const finalTotal = Math.max(0, baseTotal - discountCash);
        
        // Cập nhật vào các biến ẩn để hàm confirmPayment sử dụng
        document.getElementById('temp-bill-total').value = finalTotal;
        // manual-discount này dùng để lưu số tiền giảm vào hóa đơn sau này
        if (document.getElementById('manual-discount')) {
            document.getElementById('manual-discount').value = discountCash;
        }

        // Cập nhật số tiền hiển thị trên giao diện (Cần thanh toán)
        // Tìm thẻ span cuối cùng trong dòng "Cần thanh toán"
        const billContent = document.getElementById('bill-content');
        if (billContent) {
            const displayElements = billContent.querySelectorAll('div.flex.justify-between.font-black.text-xl span');
            if (displayElements.length > 0) {
                displayElements[displayElements.length - 1].innerText = finalTotal.toLocaleString() + "đ";
            }
        }
    },

    // --- LOGIC THANH TOÁN ---
   openCheckout: async () => {
    try {
        const currentId = window.selectedCourtId;
        if (!currentId) return alert("Không xác định được ID sân!");

        const courtRef = window.ref(window.db, `courts/${currentId}`);
        const snapshot = await window.get(courtRef);
        if (!snapshot.exists()) return alert("Không tìm thấy dữ liệu sân!");
        
        const court = snapshot.val();
        const conf = window.dataCache.config || {};
        
        if (!court.Gio_Vao) return alert("Sân chưa có giờ vào!");

        // 1. GỌI LOGIC TÍNH TOÁN THỜI GIAN THÔNG MINH (Từ app-logic.js)
        const timeCalc = app.calculatePickleballFinalTime(court);
        const totalMinutes = timeCalc.totalMins;
        const endTime = timeCalc.realOut;

        // 2. TÍNH TIỀN GIỜ LINH HOẠT THEO NHIỀU KHUNG GIỜ
        const priceList = conf.priceList || {};
        const timeSlots = conf.timeSlots || []; // Danh sách khung giờ mới
        
        // Lấy giá gốc theo loại sân
        let hourlyRate = parseInt(priceList[court.Loai_San] || conf.priceNormal || 100000);
        
        // --- LOGIC TÌM PHỤ PHÍ THEO KHUNG GIỜ ---
        // Ưu tiên kiểm tra khung giờ dựa trên Giờ Vào Lịch (nếu có) hoặc Giờ Vào Thực Tế
        const checkTime = court.Gio_Vao_Lich || court.Gio_Vao;
        const matchedSlot = timeSlots.find(slot => checkTime >= slot.start && checkTime < slot.end);
        
        if (matchedSlot) {
            hourlyRate += parseInt(matchedSlot.price || 0);
            console.log(`Áp dụng phụ phí khung giờ ${matchedSlot.start}-${matchedSlot.end}: +${matchedSlot.price}đ`);
        }

        // Phụ phí cuối tuần (Cộng dồn sau khi đã có giá khung giờ)
        const now = new Date();
        const isWeekend = now.getDay() === 0 || now.getDay() === 6;
        if (isWeekend && conf.weekendUp) {
            hourlyRate = hourlyRate * (1 + parseInt(conf.weekendUp) / 100);
        }

        // --- QUY TẮC LÀM TRÒN BLOCK 30 PHÚT ---
        const roundedMinutes = Math.ceil(totalMinutes / 30) * 30;
        const timeMoney = (roundedMinutes / 60) * hourlyRate;

        // 3. TÍNH TIỀN DỊCH VỤ
        let sMoney = 0; 
        let sLines = '';
        let services = court.Playing?.Services || court.Dich_Vu || {};
        if (typeof services !== 'object' || services === null) services = {};

        Object.values(services).forEach(item => {
            if (item && typeof item === 'object') {
                const p = parseInt(item.Price || item.Gia || 0);
                const q = parseInt(item.Qty || item.SL || item.So_Luong || 0);
                if (q > 0) {
                    sMoney += (p * q);
                    sLines += `
                        <div class="flex justify-between text-xs text-slate-600">
                            <span>${item.Name || item.Ten_Mon || item.Ten} x${q}</span>
                            <span>${(p * q).toLocaleString()}đ</span>
                        </div>`;
                }
            }
        });

        // 4. XỬ LÝ GIẢM GIÁ HỘI VIÊN (THEO HẠNG)
        let discountPercent = 0;
        let rankName = "Vãng lai";
        if (court.Member_ID && window.dataCache.members) {
            const member = window.dataCache.members[court.Member_ID];
            if (member) {
                rankName = member.Hang_HV || "Đồng";
                const rankKey = rankName === "Kim cương" ? "mDiamond" : (rankName === "Vàng" ? "mGold" : (rankName === "Bạc" ? "mSilver" : "mCopper"));
                discountPercent = parseInt(conf[rankKey] || 0);
            }
        }

        // 5. TỔNG HỢP TIỀN
        const deposit = Number(court.Da_Coc || 0);
        const subTotal = timeMoney + sMoney; 
        const discountMoney = Math.round((subTotal * discountPercent) / 100);
        const finalTotal = Math.max(0, subTotal - discountMoney - deposit);

        // Gán dữ liệu vào các ô ẩn để xử lý khi bấm "Xác nhận thanh toán"
        document.getElementById('temp-bill-total').value = finalTotal;
        document.getElementById('base-total-without-manual').value = subTotal - discountMoney;
        if (document.getElementById('manual-discount-cash')) document.getElementById('manual-discount-cash').value = 0;
        if (document.getElementById('manual-discount-percent')) document.getElementById('manual-discount-percent').value = 0;
        
        // 6. HIỂN THỊ GIAO DIỆN HÓA ĐƠN
        const billContent = document.getElementById('bill-content');
        if (billContent) {
            billContent.innerHTML = `
                <div class="space-y-3">
                    <div class="p-3 bg-blue-50 rounded-2xl border border-blue-100 mb-2">
                        <div class="flex justify-between font-black text-blue-800 text-xs">
                            <span>THỜI GIAN TÍNH TIỀN:</span>
                            <span>${(roundedMinutes / 60).toFixed(1)} Giờ</span>
                        </div>
                        <div class="flex justify-between text-[10px] text-blue-600 mt-1">
                            <span>${court.Gio_Vao} ➔ ${endTime}</span>
                            <span class="italic text-right">${timeCalc.detail}</span>
                        </div>
                        ${matchedSlot ? `
                        <div class="text-[9px] font-bold text-rose-500 mt-1 border-t border-blue-100 pt-1 uppercase">
                            * Đã bao gồm phụ phí khung giờ: +${matchedSlot.price.toLocaleString()}đ/h
                        </div>` : ''}
                    </div>

                    <div class="flex justify-between font-bold border-b border-slate-100 pb-2 text-slate-700">
                        <div>Tiền giờ sân</div>
                        <span>${timeMoney.toLocaleString()}đ</span>
                    </div>
                    
                    <div class="py-1 space-y-1">
                        ${sLines || '<p class="text-[10px] text-slate-400 italic">Không có dịch vụ</p>'}
                    </div>

                    ${discountPercent > 0 ? `
                    <div class="flex justify-between text-emerald-600 text-xs font-bold italic">
                        <span>Giảm giá hạng ${rankName} (${discountPercent}%):</span>
                        <span>-${discountMoney.toLocaleString()}đ</span>
                    </div>` : ''}

                    ${deposit > 0 ? `
                    <div class="flex justify-between text-orange-600 font-bold bg-orange-50 p-2 rounded-lg border border-orange-100 italic text-xs">
                        <span>Đã trừ tiền đặt cọc:</span>
                        <span>-${deposit.toLocaleString()}đ</span>
                    </div>` : ''}

                    <div class="flex justify-between font-black text-xl text-blue-600 border-t-2 border-dashed pt-3 uppercase tracking-tighter">
                        <span>Cần thanh toán</span>
                        <span>${finalTotal.toLocaleString()}đ</span>
                    </div>
                </div>`;
        }

        window.ui.closeModal('court-detail');
        window.ui.openModal('checkout');
    } catch (err) { 
        console.error("Lỗi openCheckout:", err);
        alert("Lỗi: " + err.message); 
    }
},
};
