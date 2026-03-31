const appMobile = {
    init: () => {
        console.log("📱 Mobile App đang khởi tạo...");
        const today = new Date().toISOString().split('T')[0];
        if (document.getElementById('view-date-mobile')) {
            document.getElementById('view-date-mobile').value = today;
        }

        const checkFB = setInterval(() => {
            if (window.db && window.onValue) {
                clearInterval(checkFB);
                appMobile.setupSync();
            }
        }, 300);
    },

    setupSync: () => {
        window.onValue(window.ref(window.db, "/"), (snapshot) => {
            const data = snapshot.val() || {};
            window.dataCache = data;
            
            appMobile.renderDashboard(data);
            appMobile.renderCourts(data.courts || {});
            appMobile.renderCalendar();

            // THÊM ĐOẠN NÀY: Nếu đang mở popup Nhập kho thì cập nhật ngay lập tức
            const reportModal = document.getElementById('modal-report-detail');
            const reportTitle = document.getElementById('report-popup-title')?.innerText;
            if (reportModal && !reportModal.classList.contains('hidden') && reportTitle === "Lịch sử nhập kho") {
                appMobile.viewReportDetail('inventory');
            }
        });
    },

    // 1. Render Dashboard Trang chủ
    renderDashboard: (data) => {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayFormatted = todayStr.split('-').reverse().join('/');
        const bills = Object.values(data.bills || {});
        
        const dateToNum = (s) => {
            if (!s) return 0;
            const d = s.includes('-') ? s.split('-') : s.split('/');
            return s.includes('-') ? parseInt(d[0]+d[1]+d[2]) : parseInt(d[2]+d[1]+d[0]);
        };

        const todayNum = dateToNum(todayStr);
        let totalRevenue = 0;
        let hourlyData = new Array(24).fill(0);

        bills.forEach(b => {
            const bDateStr = b.Ngay_Thang || (b.Thoi_Gian ? b.Thoi_Gian.split(' ')[0] : "");
            if (dateToNum(bDateStr) === todayNum) {
                const amt = Number(b.Tong_Tien || 0);
                totalRevenue += amt;

                if (b.Thoi_Gian) {
                    const timeStr = b.Thoi_Gian.split(' ').find(p => p.includes(':')) || "";
                    const hour = parseInt(timeStr.split(':')[0]);
                    if (!isNaN(hour) && hour < 24) hourlyData[hour] += amt;
                }
            }
        });
        
        document.getElementById('stat-revenue').innerText = totalRevenue.toLocaleString() + 'đ';

        const chartContainer = document.getElementById('peak-hour-chart-mobile');
        if (chartContainer) {
            const maxVal = Math.max(...hourlyData) || 1;
            chartContainer.innerHTML = hourlyData.slice(6, 23).map((val, i) => {
                const h = i + 6;
                const hPercent = (val / maxVal) * 100;
                return `
                    <div class="flex-1 flex flex-col justify-end items-center h-full group relative">
                        <div class="${val > 0 ? 'bg-blue-500' : 'bg-slate-100'} w-full rounded-t-sm transition-all duration-700" 
                             style="height: ${Math.max(hPercent, 4)}%"></div>
                        <span class="text-[6px] font-bold text-slate-300 mt-1">${h}h</span>
                    </div>`;
            }).join('');
        }
    },
    
    // HÀM MỚI 1: Gợi ý hội viên khi gõ
    suggestMember: (val) => {
        const suggestionsBox = document.getElementById('mb-member-suggestions');
        const phoneInput = document.getElementById('mb-phone');
        const memberIdInput = document.getElementById('mb-member-id');
        
        if (!val || val.length < 1) {
            suggestionsBox.classList.add('hidden');
            memberIdInput.value = "";
            return;
        }

        const members = Object.entries(window.dataCache.members || {});
        const search = val.toLowerCase();
        
        // Lọc theo tên hoặc số điện thoại
        const filtered = members.filter(([id, m]) => 
            (m.Ten_HV || "").toLowerCase().includes(search) || 
            (m.SDT || "").includes(search)
        ).slice(0, 5); // Lấy tối đa 5 gợi ý cho gọn màn hình mobile

        if (filtered.length > 0) {
            suggestionsBox.innerHTML = filtered.map(([id, m]) => `
                <div onclick="appMobile.selectMember('${id}', '${m.Ten_HV}', '${m.SDT}')" 
                     class="p-4 border-b border-slate-50 active:bg-blue-50 flex justify-between items-center">
                    <div>
                        <p class="font-black text-slate-800 text-xs uppercase">${m.Ten_HV}</p>
                        <p class="text-[10px] text-slate-400 font-bold">${m.SDT || 'Không có SĐT'}</p>
                    </div>
                    <span class="bg-blue-100 text-blue-600 text-[8px] font-black px-2 py-1 rounded-lg uppercase">Hội viên</span>
                </div>
            `).join('');
            suggestionsBox.classList.remove('hidden');
        } else {
            suggestionsBox.classList.add('hidden');
            memberIdInput.value = "";
        }
    },
    // HÀM MỚI 2: Khi nhấn chọn một hội viên từ danh sách
    selectMember: (id, name, phone) => {
        document.getElementById('mb-name').value = name;
        document.getElementById('mb-phone').value = phone || "";
        document.getElementById('mb-member-id').value = id;
        document.getElementById('mb-member-suggestions').classList.add('hidden');
        
        // Hiệu ứng đổi màu để biết đã chọn đúng hội viên
        const nameInput = document.getElementById('mb-name');
        nameInput.classList.add('text-emerald-600');
        setTimeout(() => nameInput.classList.remove('text-emerald-600'), 1000);
    },


    // 2. LOGIC CHI TIẾT CÁC BÁO CÁO
    viewReportDetail: (type) => {
        let title = "";
        let html = "";
        
        // 1. Khai báo tất cả các nguồn dữ liệu cần thiết
        const bills = Object.values(window.dataCache.bills || {});
        const inventory = Object.values(window.dataCache.inventory || window.dataCache.imports || {});
        const ledger = Object.values(window.dataCache.ledger || {});
        
        const today = new Date().toISOString().split('T')[0]; // 2026-03-31
        const todayFormatted = today.split('-').reverse().join('/'); // 31/03/2026

        switch (type) {
            case 'daily':
                title = "Báo cáo cuối ngày";
                // Lấy ngày đang chọn trong popup (nếu có), nếu không mặc định là hôm nay
                const selectedDate = document.getElementById('report-detail-date')?.value || today;
                const selectedDateFormatted = selectedDate.split('-').reverse().join('/');

                // Lọc dữ liệu theo ngày đã chọn
                const dailyBills = bills.filter(b => {
                    const bDate = b.Ngay_Thang || (b.Thoi_Gian ? b.Thoi_Gian.split(' ')[0] : "");
                    return bDate === selectedDateFormatted || bDate === selectedDate;
                });

                // Tính toán các chỉ số
                const totalIncome = dailyBills.reduce((sum, b) => sum + (Number(b.Tong_Tien) || 0), 0);
                const cashIncome = dailyBills.filter(b => b.PTTT === "Tiền mặt").reduce((sum, b) => sum + (Number(b.Tong_Tien) || 0), 0);
                const bankIncome = dailyBills.filter(b => b.PTTT === "Chuyển khoản").reduce((sum, b) => sum + (Number(b.Tong_Tien) || 0), 0);
                
                // Giả định bạn có nhánh 'expenses' (chi phí) trong window.dataCache
                const expenses = Object.values(window.dataCache.expenses || {});
                const dailyExpenses = expenses.filter(e => e.Ngay === selectedDate || e.Ngay === selectedDateFormatted);
                const totalExpense = dailyExpenses.reduce((sum, e) => sum + (Number(e.So_Tien) || 0), 0);

                html = `
                    <div class="mb-6 flex items-center gap-2 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                        <span class="text-[10px] font-black uppercase text-slate-400">Xem ngày:</span>
                        <input type="date" id="report-detail-date" value="${selectedDate}" 
                               onchange="appMobile.viewReportDetail('daily')"
                               class="flex-1 bg-transparent font-black text-blue-600 outline-none text-sm">
                    </div>

                    <div class="grid grid-cols-2 gap-3 mb-6">
                        <div class="bg-blue-600 p-4 rounded-[2rem] text-white col-span-2 shadow-lg shadow-blue-100">
                            <p class="text-[9px] font-black uppercase opacity-60">Lợi nhuận gộp (Thu - Chi)</p>
                            <p class="text-3xl font-[900]">${(totalIncome - totalExpense).toLocaleString()}đ</p>
                        </div>
                        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <p class="text-[9px] font-black text-emerald-500 uppercase">Tổng Thu (+)</p>
                            <p class="text-sm font-black text-slate-800">${totalIncome.toLocaleString()}đ</p>
                        </div>
                        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <p class="text-[9px] font-black text-rose-500 uppercase">Tổng Chi (-)</p>
                            <p class="text-sm font-black text-slate-800">${totalExpense.toLocaleString()}đ</p>
                        </div>
                    </div>

                    <div class="bg-slate-100 p-4 rounded-2xl mb-6 flex justify-around border border-dashed border-slate-200">
                        <div class="text-center">
                            <p class="text-[8px] font-black text-slate-400 uppercase">Tiền mặt</p>
                            <p class="text-xs font-black text-slate-600">${cashIncome.toLocaleString()}</p>
                        </div>
                        <div class="w-[1px] h-8 bg-slate-200"></div>
                        <div class="text-center">
                            <p class="text-[8px] font-black text-slate-400 uppercase">Chuyển khoản</p>
                            <p class="text-xs font-black text-slate-600">${bankIncome.toLocaleString()}</p>
                        </div>
                    </div>

                    <h3 class="text-[10px] font-black text-slate-400 uppercase mb-3 ml-2 italic">● Danh sách hóa đơn</h3>
                    <div class="space-y-2">
                        ${dailyBills.map(b => `
                            <div class="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-50 shadow-sm">
                                <div>
                                    <p class="font-black text-slate-700 text-[10px] uppercase">${b.Khach_Hang || 'Khách lẻ'}</p>
                                    <p class="text-[8px] text-slate-300 font-bold">${b.PTTT} • ${b.Thoi_Gian?.split(' ')[1] || ''}</p>
                                </div>
                                <p class="font-black text-blue-600 text-xs">${Number(b.Tong_Tien).toLocaleString()}đ</p>
                            </div>
                        `).join('') || '<p class="text-center py-10 opacity-30 text-xs italic">Không có dữ liệu ngày này</p>'}
                    </div>`;
                break;

            case 'sales': {
                title = "Báo cáo bán hàng";
                
                const filterType = document.getElementById('report-sales-filter')?.value || 'today';
                const fromDate = document.getElementById('sales-from')?.value;
                const toDate = document.getElementById('sales-to')?.value;

                // 1. LOGIC LẤY THỜI GIAN (Sao chép từ Báo cáo cuối ngày)
                const now = new Date();
                const toNum = (d) => parseInt(d.toISOString().split('T')[0].replace(/-/g, ''));
                let startNum = 0, endNum = 99999999;

                if (filterType === 'today') { 
                    startNum = endNum = toNum(now); 
                } else if (filterType === 'yesterday') { 
                    const yest = new Date(); yest.setDate(now.getDate() - 1); 
                    startNum = endNum = toNum(yest); 
                } else if (filterType === 'this-week') { 
                    const first = now.getDate() - now.getDay() + 1;
                    startNum = toNum(new Date(now.setDate(first))); 
                    endNum = 20991231; 
                } else if (filterType === 'this-month') { 
                    startNum = parseInt(now.toISOString().split('T')[0].substring(0, 7).replace('-', '') + '01'); 
                    endNum = 20991231; 
                } else if (filterType === 'custom') { 
                    if (fromDate) startNum = parseInt(fromDate.replace(/-/g, '')); 
                    if (toDate) endNum = parseInt(toDate.replace(/-/g, '')); 
                }

                // 2. LỌC VÀ TÍNH TOÁN DỰA TRÊN KHOẢNG START - END
                const allBills = Object.values(window.dataCache.bills || {});
                const productMap = {}; 
                let totalRevenue = 0;

                allBills.forEach(bill => {
                    // Lấy ngày của hóa đơn và chuyển về số YYYYMMDD
                    const rawDate = bill.Ngay_Thang || bill.Ngay || "";
                    if (!rawDate) return;
                    const billNum = parseInt(rawDate.replace(/-/g, '').substring(0, 8));

                    if (billNum >= startNum && billNum <= endNum) {
                        totalRevenue += Number(bill.Tong_Tien || 0);
                        
                        if (bill.Items && Array.isArray(bill.Items)) {
                            bill.Items.forEach(item => {
                                const name = item.Ten || "Dịch vụ";
                                if (!productMap[name]) productMap[name] = { qty: 0, amount: 0 };
                                productMap[name].qty += Number(item.SL || 0);
                                productMap[name].amount += Number(item.SL || 0) * Number(item.Gia || 0);
                            });
                        }
                    }
                });

                const sortedData = Object.entries(productMap).sort((a, b) => b[1].amount - a[1].amount);

                html = `
                    <div class="space-y-3 mb-6">
                        <select id="report-sales-filter" onchange="appMobile.viewReportDetail('sales')" 
                                class="w-full p-4 bg-white rounded-2xl border border-slate-100 shadow-sm font-black text-blue-600 outline-none uppercase text-[10px]">
                            <option value="today" ${filterType==='today'?'selected':''}>Hôm nay</option>
                            <option value="yesterday" ${filterType==='yesterday'?'selected':''}>Hôm qua</option>
                            <option value="this-week" ${filterType==='this-week'?'selected':''}>Tuần này</option>
                            <option value="this-month" ${filterType==='this-month'?'selected':''}>Tháng này</option>
                            <option value="custom" ${filterType==='custom'?'selected':''}>Tùy chọn ngày</option>
                        </select>
                        ${filterType === 'custom' ? `
                            <div class="grid grid-cols-2 gap-2 animate-fadeIn">
                                <input type="date" id="sales-from" value="${fromDate || ''}" onchange="appMobile.viewReportDetail('sales')" class="p-3 bg-white border border-slate-100 rounded-xl text-[10px] font-bold">
                                <input type="date" id="sales-to" value="${toDate || ''}" onchange="appMobile.viewReportDetail('sales')" class="p-3 bg-white border border-slate-100 rounded-xl text-[10px] font-bold">
                            </div>
                        ` : ''}
                    </div>

                    <div class="bg-blue-600 p-6 rounded-[2rem] text-white mb-6 shadow-xl relative overflow-hidden">
                        <p class="text-[10px] font-black uppercase opacity-60 tracking-widest">Tổng doanh thu bán hàng</p>
                        <p class="text-3xl font-[900] mt-1 tracking-tighter">${totalRevenue.toLocaleString()}đ</p>
                        <i class="fa-solid fa-chart-line absolute right-6 bottom-4 text-white/10 text-6xl"></i>
                    </div>

                    <div class="space-y-3">
                        ${sortedData.map(([name, data]) => `
                            <div class="bg-white p-4 rounded-2xl border border-slate-50 shadow-sm flex justify-between items-center">
                                <div class="flex-1 min-w-0 pr-4">
                                    <p class="font-black text-slate-800 text-[11px] uppercase truncate">${name}</p>
                                    <p class="text-[9px] text-slate-400 font-bold uppercase italic mt-0.5">Số lượng: ${data.qty}</p>
                                </div>
                                <div class="text-right">
                                    <p class="font-black text-slate-700 text-sm">${data.amount.toLocaleString()}đ</p>
                                </div>
                            </div>
                        `).join('') || '<div class="py-20 text-center opacity-20 font-black uppercase text-[10px]">Không có dữ liệu</div>'}
                    </div>
                `;
            }
            break;

         case 'inventory': {
    title = "Lịch sử nhập kho";
    
    // Lấy giá trị bộ lọc
    const filterType = document.getElementById('report-inv-filter')?.value || 'today';
    const fromDate = document.getElementById('inv-from')?.value;
    const toDate = document.getElementById('inv-to')?.value;
    const now = new Date();
    
    // Hàm chuẩn hóa ngày (Xử lý 31/3/2026 hoặc 2026-03-31)
    const dateToNum = (dateStr) => {
        if (!dateStr) return 0;
        let clean = dateStr.toString().split(' ')[0].trim().replace(/\//g, '-');
        let parts = clean.split('-');
        if (parts.length !== 3) return 0;
        let y, m, d;
        if (parts[0].length === 4) { [y, m, d] = parts; } 
        else { [d, m, y] = parts; }
        return parseInt(y + m.padStart(2, '0') + d.padStart(2, '0'));
    };

    let startNum = 0, endNum = 99999999;
    if (filterType === 'today') { startNum = endNum = dateToNum(now.toLocaleDateString('vi-VN')); }
    else if (filterType === 'yesterday') { 
        const yest = new Date(); yest.setDate(now.getDate() - 1); 
        startNum = endNum = dateToNum(yest.toLocaleDateString('vi-VN')); 
    } else if (filterType === 'this-month') { 
        startNum = parseInt(now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, '0') + '01');
        endNum = 20991231;
    } else if (filterType === 'custom') { 
        if (fromDate) startNum = dateToNum(fromDate); 
        if (toDate) endNum = dateToNum(toDate); 
    }

    const dbSource = window.dataCache.stocks || {}; 
    const importList = Object.values(dbSource);
    
    const filteredData = importList.filter(item => {
        const itemNum = dateToNum(item.date);
        return itemNum >= startNum && itemNum <= endNum;
    }).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); // Sắp xếp theo thời gian mới nhất

    // --- TÍNH TOÁN THEO ĐÚNG CẤU TRÚC APP-LOGIC.JS ---
    let totalImport = 0;
    let paidAmount = 0;
    let debtAmount = 0;

    const cardsHtml = filteredData.map(item => {
        // Lấy trường 'total' trực tiếp từ item (Vì app-logic lưu tổng ở ngoài phiếu)
        const itemTotal = Number(item.total || 0);

        totalImport += itemTotal;

        const isPaid = (item.status === "Đã thanh toán");
        if (isPaid) paidAmount += itemTotal;
        else debtAmount += itemTotal;

        // Lấy tên các sản phẩm để hiển thị preview
        const productPreview = item.items ? item.items.map(p => p.name).join(', ') : (item.productName || 'Hàng hóa');

        return `
        <div class="bg-white p-4 rounded-2xl border border-slate-50 shadow-sm flex justify-between items-center mb-3">
            <div class="flex-1 min-w-0 pr-4">
                <p class="text-[8px] font-black text-blue-500 uppercase">${item.supplierName || 'NCC Lẻ'}</p>
                <p class="font-black text-slate-800 text-[11px] uppercase truncate">${productPreview}</p>
                <p class="text-[9px] text-slate-400 font-bold mt-0.5 italic">${item.date} ${item.time || ''}</p>
            </div>
            <div class="text-right">
                <p class="font-black text-slate-700 text-sm">${itemTotal.toLocaleString()}đ</p>
                <span class="inline-block px-2 py-0.5 rounded-lg text-[8px] font-black uppercase mt-1 ${isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}">
                    ${item.status || 'Chưa thanh toán'}
                </span>
            </div>
        </div>`;
    }).join('');

    html = `
        <div class="space-y-3 mb-6 px-1">
            <select id="report-inv-filter" onchange="appMobile.viewReportDetail('inventory')" 
                    class="w-full p-4 bg-white rounded-2xl border border-slate-100 shadow-sm font-black text-blue-600 outline-none uppercase text-[10px]">
                <option value="today" ${filterType==='today'?'selected':''}>Hôm nay</option>
                <option value="yesterday" ${filterType==='yesterday'?'selected':''}>Hôm qua</option>
                <option value="this-month" ${filterType==='this-month'?'selected':''}>Tháng này</option>
                <option value="custom" ${filterType==='custom'?'selected':''}>Tùy chọn ngày</option>
            </select>
            ${filterType === 'custom' ? `
                <div class="grid grid-cols-2 gap-2 animate-fadeIn">
                    <input type="date" id="inv-from" value="${fromDate || ''}" onchange="appMobile.viewReportDetail('inventory')" class="p-3 bg-white border border-slate-100 rounded-xl text-[10px] font-bold outline-none">
                    <input type="date" id="inv-to" value="${toDate || ''}" onchange="appMobile.viewReportDetail('inventory')" class="p-3 bg-white border border-slate-100 rounded-xl text-[10px] font-bold outline-none">
                </div>
            ` : ''}
        </div>

        <div class="grid grid-cols-1 gap-3 mb-6 px-1">
            <div class="bg-slate-900 p-5 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden text-center">
                <p class="text-[9px] font-black uppercase opacity-40 italic tracking-widest">Tổng vốn nhập hàng</p>
                <p class="text-2xl font-[900] text-emerald-400 mt-1">${totalImport.toLocaleString()}đ</p>
            </div>
            <div class="flex gap-2">
                <div class="flex-1 bg-emerald-500 p-4 rounded-[1.5rem] text-white shadow-lg text-center">
                    <p class="text-[8px] font-black uppercase opacity-70">Đã thanh toán</p>
                    <p class="text-sm font-[900]">${paidAmount.toLocaleString()}đ</p>
                </div>
                <div class="flex-1 bg-rose-500 p-4 rounded-[1.5rem] text-white shadow-lg text-center">
                    <p class="text-[8px] font-black uppercase opacity-70">Còn nợ NCC</p>
                    <p class="text-sm font-[900]">${debtAmount.toLocaleString()}đ</p>
                </div>
            </div>
        </div>

        <div class="space-y-3 pb-10 px-1">
            ${cardsHtml || '<div class="py-20 text-center opacity-20 font-black uppercase text-[10px] italic">Không có dữ liệu</div>'}
        </div>
    `;
}
break;

           case 'cash': {
    title = "Sổ quỹ hệ thống";
    
    // 1. Lấy giá trị bộ lọc từ giao diện
    const cfType = document.getElementById('report-cash-filter')?.value || 'today';
    const cfFrom = document.getElementById('cash-from')?.value;
    const cfTo = document.getElementById('cash-to')?.value;

    // 2. Hàm chuẩn hóa ngày (Chuyển mọi định dạng về số YYYYMMDD để so sánh)
    const dateToNum = (dateStr) => {
        if (!dateStr) return 0;
        // Xử lý nếu dateStr là Object Date
        if (dateStr instanceof Date) {
            const y = dateStr.getFullYear();
            const m = (dateStr.getMonth() + 1).toString().padStart(2, '0');
            const d = dateStr.getDate().toString().padStart(2, '0');
            return parseInt(`${y}${m}${d}`);
        }
        // Xử lý chuỗi (xóa giờ nếu có, thay / bằng -)
        let clean = dateStr.toString().split(' ')[0].replace(/\//g, '-');
        let parts = clean.split('-');
        if (parts.length !== 3) return 0;
        
        let y, m, d;
        if (parts[0].length === 4) { [y, m, d] = parts; } // YYYY-MM-DD
        else { [d, m, y] = parts; } // DD-MM-YYYY
        return parseInt(y + m.padStart(2, '0') + d.padStart(2, '0'));
    };

    const now = new Date();
    let startNum = 0, endNum = 99999999;

    // 3. Thiết lập khoảng chặn startNum - endNum
    if (cfType === 'today') {
        startNum = endNum = dateToNum(now);
    } else if (cfType === 'yesterday') {
        const yest = new Date(); yest.setDate(now.getDate() - 1);
        startNum = endNum = dateToNum(yest);
    } else if (cfType === 'week') {
        const first = now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1);
        startNum = dateToNum(new Date(now.setDate(first)));
        endNum = 20991231;
    } else if (cfType === 'month') {
        startNum = parseInt(now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, '0') + '01');
        endNum = 20991231;
    } else if (cfType === 'custom') {
        if (cfFrom) startNum = dateToNum(cfFrom);
        if (cfTo) endNum = dateToNum(cfTo);
    }

    // 4. Truy xuất và Lọc dữ liệu từ Ledger
    const fullLedger = Object.values(window.dataCache.ledger || {});
    const filteredLedger = fullLedger.filter(item => {
        const itemNum = dateToNum(item.Ngay || item.Thoi_Gian);
        return itemNum >= startNum && itemNum <= endNum;
    }).sort((a, b) => (b.Thoi_Gian || "").localeCompare(a.Thoi_Gian || ""));

    // 5. Tính toán Thu/Chi/Tồn
    let thuTM = 0, chiTM = 0, thuCK = 0, chiCK = 0;

    filteredLedger.forEach(item => {
        const val = Number(item.So_Tien || 0);
        const pttt = item.PTTT || "Tiền mặt";
        if (item.Loai === 'Thu') {
            if (pttt === 'Tiền mặt') thuTM += val; else thuCK += val;
        } else {
            if (pttt === 'Tiền mặt') chiTM += val; else chiCK += val;
        }
    });

    const tonTM = thuTM - chiTM;
    const tonCK = thuCK - chiCK;
    const tongTon = tonTM + tonCK;

    // 6. Giao diện hiển thị
    html = `
        <div class="space-y-3 mb-6">
            <select id="report-cash-filter" onchange="appMobile.viewReportDetail('cash')" 
                    class="w-full p-4 bg-white rounded-2xl border border-slate-100 shadow-sm font-black text-blue-600 outline-none uppercase text-[11px]">
                <option value="today" ${cfType==='today'?'selected':''}>Hôm nay</option>
                <option value="yesterday" ${cfType==='yesterday'?'selected':''}>Hôm qua</option>
                <option value="week" ${cfType==='week'?'selected':''}>Tuần này</option>
                <option value="month" ${cfType==='month'?'selected':''}>Tháng này</option>
                <option value="custom" ${cfType==='custom'?'selected':''}>Tùy chọn ngày</option>
            </select>
            ${cfType === 'custom' ? `
                <div class="grid grid-cols-2 gap-2 animate-fadeIn">
                    <input type="date" id="cash-from" value="${cfFrom || ''}" onchange="appMobile.viewReportDetail('cash')" class="p-3 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none">
                    <input type="date" id="cash-to" value="${cfTo || ''}" onchange="appMobile.viewReportDetail('cash')" class="p-3 bg-white border border-slate-100 rounded-xl text-xs font-bold outline-none">
                </div>
            ` : ''}
        </div>

        <div class="bg-slate-900 p-6 rounded-[2.5rem] text-white mb-6 shadow-xl relative overflow-hidden">
            <p class="text-[10px] font-black uppercase opacity-50 italic">Tổng tồn quỹ thực tế (TM + CK)</p>
            <p class="text-3xl font-[900] text-blue-400 mt-1">${tongTon.toLocaleString()}đ</p>
            <i class="fa-solid fa-vault absolute right-6 bottom-4 text-white/5 text-6xl"></i>
        </div>

        <div class="grid grid-cols-2 gap-3 mb-6">
            <div class="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 shadow-sm">
                <p class="text-[9px] font-black text-emerald-500 uppercase mb-1">Tiền mặt tồn</p>
                <p class="text-sm font-[900] text-emerald-700">${tonTM.toLocaleString()}đ</p>
            </div>
            <div class="bg-blue-50 p-4 rounded-2xl border border-blue-100 shadow-sm">
                <p class="text-[9px] font-black text-blue-500 uppercase mb-1">Chuyển khoản tồn</p>
                <p class="text-sm font-[900] text-blue-700">${tonCK.toLocaleString()}đ</p>
            </div>
        </div>

        <h3 class="text-[10px] font-black text-slate-400 uppercase mb-3 ml-2 italic">● Nhật ký thu chi mới nhất</h3>
        <div class="space-y-3 pb-10">
            ${filteredLedger.map(item => {
                const isThu = item.Loai === 'Thu';
                const isCash = (item.PTTT === 'Tiền mặt');
                return `
                    <div class="bg-white p-4 rounded-2xl border border-slate-50 shadow-sm flex justify-between items-center">
                        <div class="flex-1 min-w-0">
                            <p class="font-black text-slate-800 text-[11px] uppercase truncate">${item.Doi_Tuong || 'N/A'}</p>
                            <p class="text-[8px] text-slate-400 font-bold italic truncate">
                                <i class="${isCash ? 'fa-solid fa-money-bill-1' : 'fa-solid fa-building-columns'} mr-1"></i>
                                ${item.Noi_Dung}
                            </p>
                        </div>
                        <div class="text-right ml-4">
                            <p class="font-[900] ${isThu ? 'text-emerald-500' : 'text-rose-500'} text-xs">
                                ${isThu ? '+' : '-'}${Number(item.So_Tien).toLocaleString()}
                            </p>
                            <p class="text-[7px] text-slate-300 font-bold uppercase tracking-tighter">${item.Thoi_Gian?.split(' ')[1] || ''}</p>
                        </div>
                    </div>
                `;
            }).join('') || '<div class="py-10 text-center opacity-20 italic text-xs uppercase font-black">Trống</div>'}
        </div>
    `;
}
break;
        }

        // Hiển thị nội dung vào Popup hiện có trong mobile.html
        const modal = document.getElementById('modal-report-detail');
        const sheet = document.getElementById('report-sheet');
        
        document.getElementById('report-popup-title').innerText = title;
        document.getElementById('report-popup-body').innerHTML = html;
        
        modal.classList.remove('hidden');
        setTimeout(() => sheet.style.transform = "translateY(0)", 10);
    },

    closeReportModal: () => {
        const modal = document.getElementById('modal-report-detail');
        const sheet = document.getElementById('report-sheet');
        sheet.style.transform = "translateY(100%)";
        setTimeout(() => modal.classList.add('hidden'), 300);
    },

    // --- Các hàm hỗ trợ khác ---
    renderCourts: (courts) => {
        const container = document.getElementById('grid-courts-mobile');
        if (!container) return;
        let html = '';
        Object.entries(courts).forEach(([id, c]) => {
            if (c.Trang_Thai !== "Đang chơi") return;
            html += `
                <div class="p-5 rounded-[2rem] border border-rose-100 bg-rose-50 shadow-sm flex justify-between items-center">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg"><i class="fa-solid fa-table-tennis-paddle-ball"></i></div>
                        <div><p class="font-black text-slate-800 uppercase text-sm">${c.Ten_San || id}</p><p class="text-[10px] font-black text-rose-500 uppercase italic"><span class="pulse-red">●</span> ${c.Ten_Khach || 'Khách lẻ'}</p></div>
                    </div>
                    <div class="text-right"><p class="text-[9px] font-black text-slate-400 uppercase mb-1">Vào lúc</p><p class="font-black text-slate-700 text-base">${c.Gio_Vao || '--:--'}</p></div>
                </div>`;
        });
        container.innerHTML = html || '<div class="py-10 text-center opacity-20 font-black uppercase text-[10px]">Tất cả sân đang trống</div>';
    },

    renderCalendar: () => {
    const container = document.getElementById('list-calendar-mobile');
    const viewDate = document.getElementById('view-date-mobile')?.value;
    if (!container || !viewDate) return;

    const bookings = window.dataCache.bookings || {};
    const courts = window.dataCache.courts || {};

    const list = Object.entries(bookings)
        .filter(([id, b]) => b.Ngay === viewDate && b.Trang_Thai !== "Chờ xác nhận")
        .sort((a, b) => a[1].Bat_Dau.localeCompare(b[1].Bat_Dau));

    if (list.length === 0) {
        container.innerHTML = `<div class="py-20 text-center opacity-20"><i class="fa-solid fa-calendar-xmark text-4xl mb-2"></i><p class="font-black uppercase text-[10px]">Không có lịch đặt</p></div>`;
        return;
    }

    container.innerHTML = list.map(([id, b]) => `
        <div class="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 animate-fadeIn">
            <div class="w-16 text-center border-r pr-4">
                <p class="text-xs font-black text-blue-600">${b.Bat_Dau}</p>
                <p class="text-[9px] font-bold text-slate-300 uppercase">${b.Ket_Thuc}</p>
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start">
                    <h3 class="font-black text-slate-800 uppercase text-[11px] leading-tight truncate mr-2">${b.Ten_Khach}</h3>
                    <span class="bg-indigo-50 text-indigo-600 text-[8px] font-black px-2 py-0.5 rounded uppercase flex-shrink-0">
                        ${courts[b.Court_ID]?.Ten_San || b.Court_ID}
                    </span>
                </div>
                <p class="text-[10px] font-bold text-slate-400 mt-1">${b.SDT || 'N/A'}</p>
            </div>
            
            <div class="flex gap-2 border-l pl-4">
                <button onclick="appMobile.editBooking('${id}')" class="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-full active:scale-90 transition-all">
                    <i class="fa-solid fa-pen text-[10px]"></i>
                </button>
                <button onclick="appMobile.deleteBooking('${id}')" class="w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-500 rounded-full active:scale-90 transition-all">
                    <i class="fa-solid fa-trash-can text-[10px]"></i>
                </button>
            </div>
        </div>`).join('');
},
// HÀM XOÁ LỊCH
    deleteBooking: async (id) => {
        if (confirm("🔔 Bạn có chắc chắn muốn xoá lịch đặt này không?")) {
            try {
                await window.remove(window.ref(window.db, `bookings/${id}`));
                // Toast thông báo nếu cần
            } catch (e) {
                alert("Lỗi khi xoá: " + e.message);
            }
        }
    },

    // HÀM SỬA LỊCH (Mở lại modal và điền dữ liệu)
    editBooking: (id) => {
    const b = window.dataCache.bookings[id];
    if (!b) return;

    // QUAN TRỌNG: Gán ID trước để hàm openBookingModal biết là đang sửa
    window.editingBookingId = id;

    // Mở modal trước để đảm bảo các thành phần HTML sẵn sàng
    appMobile.openBookingModal();

    // Điền dữ liệu (Lệnh này chạy sau openBookingModal để đè dữ liệu lên)
    document.getElementById('mb-court-id').value = b.Court_ID || "";
    document.getElementById('mb-date').value = b.Ngay || "";
    document.getElementById('mb-name').value = b.Ten_Khach || "";
    document.getElementById('mb-phone').value = b.SDT || "";
    
    // Đảm bảo format giờ là HH:mm (ví dụ 08:00) để input type="time" nhận diện được
    document.getElementById('mb-start').value = b.Bat_Dau || "";
    document.getElementById('mb-end').value = b.Ket_Thuc || "";
    
    document.getElementById('mb-deposit').value = b.Tien_Coc || 0;
    document.getElementById('mb-member-id').value = b.Member_ID || "";

    // Đổi tiêu đề
    const modalTitle = document.querySelector('#booking-sheet h2');
    if (modalTitle) modalTitle.innerHTML = `<i class="fa-solid fa-pen-to-square text-orange-500"></i> Cập nhật lịch đặt`;
},
    openBookingModal: () => {
    const modal = document.getElementById('modal-mobile-booking');
    const sheet = document.getElementById('booking-sheet');
    const courtSelect = document.getElementById('mb-court-id');

    // 1. Nạp danh sách sân
    if (courtSelect) {
        let html = '<option value="">-- Chọn sân --</option>';
        Object.entries(window.dataCache.courts || {}).forEach(([id, c]) => { 
            html += `<option value="${id}">${c.Ten_San}</option>`; 
        });
        courtSelect.innerHTML = html;
    }

    // 2. Chỉ RESET nếu là tạo mới (window.editingBookingId là null)
    if (!window.editingBookingId) {
        const modalTitle = document.querySelector('#booking-sheet h2');
        if (modalTitle) modalTitle.innerHTML = `<i class="fa-solid fa-calendar-plus text-blue-600"></i> Đặt lịch mới`;

        document.getElementById('mb-name').value = "";
        document.getElementById('mb-phone').value = "";
        document.getElementById('mb-member-id').value = "";
        document.getElementById('mb-start').value = ""; // Xóa trắng khi tạo mới
        document.getElementById('mb-end').value = "";   // Xóa trắng khi tạo mới
        document.getElementById('mb-deposit').value = 0;
        document.getElementById('mb-date').value = document.getElementById('view-date-mobile').value;
        
        const repeatChk = document.getElementById('mb-repeat');
        if (repeatChk) {
            repeatChk.checked = false;
            document.getElementById('mb-repeat-options').classList.add('hidden');
            document.querySelectorAll('input[name="mb-repeat-days"]').forEach(chk => chk.checked = false);
        }
    }

    // 3. Luôn ẩn gợi ý
    document.getElementById('mb-member-suggestions').classList.add('hidden');

    // 4. Hiển thị modal
    modal.classList.remove('hidden');
    setTimeout(() => {
        sheet.style.transform = "translateY(0)";
    }, 10);
},

    closeBookingModal: () => {
        const modal = document.getElementById('modal-mobile-booking');
        const sheet = document.getElementById('booking-sheet');
        sheet.style.transform = "translateY(100%)";
        setTimeout(() => modal.classList.add('hidden'), 300);
    },

    saveBooking: async () => {
    const courtId = document.getElementById('mb-court-id').value;
    const name = document.getElementById('mb-name').value.trim();
    const phone = document.getElementById('mb-phone').value.trim();
    const date = document.getElementById('mb-date').value;
    const start = document.getElementById('mb-start').value;
    const end = document.getElementById('mb-end').value;
    const deposit = Number(document.getElementById('mb-deposit').value || 0);
    const isRepeat = document.getElementById('mb-repeat').checked;

    if (!courtId || !name || !start || !end || !date) return alert("⚠️ Vui lòng nhập đủ thông tin bắt buộc!");

    try {
        const updates = {};
        const ngayHomNayStr = new Date().toLocaleString('vi-VN');
        
        // Dữ liệu cơ sở
        const baseData = {
            Court_ID: courtId,
            Bat_Dau: start,
            Ket_Thuc: end,
            Ten_Khach: name,
            SDT: phone,
            Member_ID: document.getElementById('mb-member-id').value || null,
            Tien_Coc: isRepeat ? 0 : deposit,
            Trang_Thai: "Chưa nhận sân",
            Thoi_Gian_Tao: ngayHomNayStr
        };

        // TRƯỜNG HỢP 1: ĐANG CHỈNH SỬA (Update)
        if (window.editingBookingId) {
            const bId = window.editingBookingId;
            // Lấy lại dữ liệu cũ để giữ các trường không hiển thị trên form (nếu cần)
            const oldData = window.dataCache.bookings[bId] || {};
            
            updates[`bookings/${bId}`] = {
                ...oldData, // Giữ lại ID gốc hoặc các trường ẩn khác
                ...baseData,
                Ngay: date,
                Thoi_Gian_Sua: ngayHomNayStr // Đánh dấu thời gian sửa
            };
            
            await window.update(window.ref(window.db), updates);
            alert("✅ Đã cập nhật lịch đặt thành công!");
        } 
        // TRƯỜNG HỢP 2: ĐẶT LỊCH CỐ ĐỊNH (Lặp lại)
        else if (isRepeat) {
            const repeatWeeks = parseInt(document.getElementById('mb-repeat-weeks').value) || 1;
            const selectedDays = Array.from(document.querySelectorAll('input[name="mb-repeat-days"]:checked')).map(el => parseInt(el.value));

            if (selectedDays.length === 0) return alert("⚠️ Vui lòng chọn ít nhất một thứ trong tuần!");

            let startDate = new Date(date);
            let count = 0;
            for (let i = 0; i < repeatWeeks * 7; i++) {
                let current = new Date(startDate);
                current.setDate(startDate.getDate() + i);
                
                if (selectedDays.includes(current.getDay())) {
                    const dateStr = current.toISOString().split('T')[0];
                    const newId = 'BK-FIX-' + Date.now() + '-' + count;
                    updates[`bookings/${newId}`] = {
                        ...baseData,
                        Ngay: dateStr
                    };
                    count++;
                }
            }
            await window.update(window.ref(window.db), updates);
            alert(`✅ Đã đặt thành công ${count} lịch cố định!`);
        } 
        // TRƯỜNG HỢP 3: TẠO MỚI LỊCH ĐƠN
        else {
            const newId = 'BK-MB-' + Date.now();
            updates[`bookings/${newId}`] = {
                ...baseData,
                Ngay: date
            };

            // Nếu có tiền cọc, tạo bill cọc tự động
            if (deposit > 0) {
                const billId = 'BILL-DEP-' + Date.now();
                updates[`bills/${billId}`] = {
                    Khach_Hang: name, 
                    Tong_Tien: deposit, 
                    PTTT: "Tiền mặt",
                    Noi_Dung: `Cọc sân (Mobile): ${courtId}`, 
                    Ngay_Thang: date,
                    Thoi_Gian: ngayHomNayStr, 
                    Loai_HD: "Tiền cọc"
                };
            }
            await window.update(window.ref(window.db), updates);
            alert("✅ Đã đặt lịch thành công!");
        }

        appMobile.closeBookingModal();
        window.editingBookingId = null; // Reset trạng thái sau khi lưu
    } catch (e) { 
        console.error("Lỗi saveBooking:", e);
        alert("Lỗi: " + e.message); 
    }
},
};

appMobile.init();
