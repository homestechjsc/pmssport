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
            // Tự động cập nhật nếu popup báo cáo đang mở
            const reportModal = document.getElementById('modal-report-detail');
            if (reportModal && !reportModal.classList.contains('hidden')) {
                // Có thể gọi lại hàm viewReportDetail để refresh dữ liệu tại đây nếu cần
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

    // 2. LOGIC CHI TIẾT CÁC BÁO CÁO
    viewReportDetail: (type) => {
        let title = "";
        let html = "";
        const today = new Date().toISOString().split('T')[0];
        const todayFormatted = today.split('-').reverse().join('/');
        const bills = Object.values(window.dataCache.bills || {});
        const products = window.dataCache.products || {};

        // Lọc các hóa đơn trong ngày hôm nay
        const todayBills = bills.filter(b => {
            const bDate = b.Ngay_Thang || (b.Thoi_Gian ? b.Thoi_Gian.split(' ')[0] : "");
            return bDate === todayFormatted || bDate === today;
        });

        switch(type) {
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

            case 'sales':
                title = "Báo cáo bán hàng";
                
                // 1. Lấy giá trị bộ lọc (Mặc định là 'today' nếu lần đầu mở)
                const filterType = document.getElementById('report-sales-filter')?.value || 'today';
                const customFrom = document.getElementById('sales-from')?.value;
                const customTo = document.getElementById('sales-to')?.value;

                const now = new Date();
                let startDate, endDate;

                // 2. Logic xác định khoảng thời gian
                if (filterType === 'today') {
                    startDate = new Date(now.setHours(0,0,0,0));
                    endDate = new Date(now.setHours(23,59,59,999));
                } else if (filterType === 'yesterday') {
                    const yesterday = new Date(now);
                    yesterday.setDate(now.getDate() - 1);
                    startDate = new Date(yesterday.setHours(0,0,0,0));
                    endDate = new Date(yesterday.setHours(23,59,59,999));
                } else if (filterType === 'week') {
                    const first = now.getDate() - now.getDay() + 1; // Thứ 2
                    startDate = new Date(new Date(now.setDate(first)).setHours(0,0,0,0));
                    endDate = new Date();
                } else if (filterType === 'month') {
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    endDate = new Date();
                } else if (filterType === 'custom') {
                    startDate = customFrom ? new Date(customFrom) : new Date();
                    endDate = customTo ? new Date(customTo) : new Date();
                    endDate.setHours(23,59,59,999);
                }

                const toNum = (d) => parseInt(d.toISOString().split('T')[0].replace(/-/g, ''));
                const startNum = toNum(startDate);
                const endNum = toNum(endDate);

                // 3. Lọc dữ liệu từ bills
                const filteredSales = bills.filter(b => {
                    const bDateStr = b.Ngay_Thang || (b.Thoi_Gian ? b.Thoi_Gian.split(' ')[0] : "");
                    // Chuyển dd/mm/yyyy hoặc yyyy-mm-dd về số để so sánh
                    const parts = bDateStr.includes('-') ? bDateStr.split('-') : bDateStr.split('/');
                    const bNum = bDateStr.includes('-') ? parseInt(parts[0]+parts[1]+parts[2]) : parseInt(parts[2]+parts[1]+parts[0]);
                    return bNum >= startNum && bNum <= endNum;
                });

                const totalSales = filteredSales.reduce((sum, b) => sum + (Number(b.Tong_Tien) || 0), 0);

                html = `
                    <div class="space-y-3 mb-6">
                        <select id="report-sales-filter" onchange="appMobile.viewReportDetail('sales')" 
                                class="w-full p-4 bg-white rounded-2xl border border-slate-100 shadow-sm font-black text-blue-600 outline-none uppercase text-[11px]">
                            <option value="today" ${filterType==='today'?'selected':''}>Hôm nay</option>
                            <option value="yesterday" ${filterType==='yesterday'?'selected':''}>Hôm qua</option>
                            <option value="week" ${filterType==='week'?'selected':''}>Tuần này</option>
                            <option value="month" ${filterType==='month'?'selected':''}>Tháng này</option>
                            <option value="custom" ${filterType==='custom'?'selected':''}>Tùy chọn ngày</option>
                        </select>

                        ${filterType === 'custom' ? `
                            <div class="grid grid-cols-2 gap-2 animate-fadeIn">
                                <input type="date" id="sales-from" value="${customFrom || ''}" onchange="appMobile.viewReportDetail('sales')" class="p-3 bg-white border border-slate-100 rounded-xl text-xs font-bold">
                                <input type="date" id="sales-to" value="${customTo || ''}" onchange="appMobile.viewReportDetail('sales')" class="p-3 bg-white border border-slate-100 rounded-xl text-xs font-bold">
                            </div>
                        ` : ''}
                    </div>

                    <div class="p-6 bg-slate-900 rounded-[2rem] text-white mb-6 shadow-xl flex justify-between items-center">
                        <div>
                            <p class="text-[10px] font-black uppercase opacity-50 italic">Doanh số bán hàng</p>
                            <p class="text-2xl font-[900]">${totalSales.toLocaleString()}đ</p>
                        </div>
                        <div class="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-xl">
                            <i class="fa-solid fa-chart-line text-blue-400"></i>
                        </div>
                    </div>

                    <h3 class="text-[10px] font-black text-slate-400 uppercase mb-3 ml-2 italic">● Chi tiết đơn hàng (${filteredSales.length})</h3>
                    <div class="space-y-3">
                        ${filteredSales.map(b => `
                            <div class="bg-white p-4 rounded-2xl border border-slate-50 shadow-sm flex justify-between items-center active:bg-slate-50">
                                <div>
                                    <p class="font-black text-slate-800 text-[11px] uppercase truncate max-w-[150px]">${b.Khach_Hang || 'Khách lẻ'}</p>
                                    <p class="text-[8px] text-slate-400 font-bold">${b.Thoi_Gian || ''}</p>
                                </div>
                                <div class="text-right">
                                    <p class="font-black text-blue-600 text-sm">${Number(b.Tong_Tien).toLocaleString()}đ</p>
                                    <span class="text-[7px] px-2 py-0.5 bg-slate-100 rounded-full font-black uppercase text-slate-400">${b.PTTT}</span>
                                </div>
                            </div>
                        `).join('') || '<div class="py-10 text-center opacity-30 text-xs italic">Không tìm thấy dữ liệu phù hợp</div>'}
                    </div>
                `;
                break;

            case 'inventory':
                title = "Báo cáo Nhập kho";
                
                // 1. Lấy bộ lọc thời gian (Tương tự báo cáo bán hàng)
                const invFilter = document.getElementById('report-inv-filter')?.value || 'today';
                const invFrom = document.getElementById('inv-from')?.value;
                const invTo = document.getElementById('inv-to')?.value;

                const d = new Date();
                let sDate, eDate;

                if (invFilter === 'today') {
                    sDate = new Date(d.setHours(0,0,0,0));
                    eDate = new Date(d.setHours(23,59,59,999));
                } else if (invFilter === 'yesterday') {
                    const yest = new Date(d); yest.setDate(d.getDate() - 1);
                    sDate = new Date(yest.setHours(0,0,0,0));
                    eDate = new Date(yest.setHours(23,59,59,999));
                } else if (invFilter === 'week') {
                    const first = d.getDate() - d.getDay() + 1;
                    sDate = new Date(new Date(d.setDate(first)).setHours(0,0,0,0));
                    eDate = new Date();
                } else if (invFilter === 'month') {
                    sDate = new Date(d.getFullYear(), d.getMonth(), 1);
                    eDate = new Date();
                } else if (invFilter === 'custom') {
                    sDate = invFrom ? new Date(invFrom) : new Date();
                    eDate = invTo ? new Date(invTo) : new Date();
                    eDate.setHours(23,59,59,999);
                }

                const dateToVal = (dt) => parseInt(dt.toISOString().split('T')[0].replace(/-/g, ''));
                const startVal = dateToVal(sDate);
                const endVal = dateToVal(eDate);

                // 2. Lọc dữ liệu từ nhánh 'import_logs' hoặc 'purchases' (Tùy tên bạn đặt trên Firebase)
                // Giả định bạn lưu lịch sử nhập hàng ở nhánh 'import_logs'
                const importLogs = Object.values(window.dataCache.import_logs || {});
                const filteredImports = importLogs.filter(log => {
                    const logDate = log.Ngay_Nhap || log.Ngay || "";
                    const parts = logDate.includes('-') ? logDate.split('-') : logDate.split('/');
                    const logNum = logDate.includes('-') ? parseInt(parts[0]+parts[1]+parts[2]) : parseInt(parts[2]+parts[1]+parts[0]);
                    return logNum >= startVal && logNum <= endVal;
                });

                // 3. Tính toán các chỉ số tài chính nhập hàng
                const totalImport = filteredImports.reduce((s, l) => s + (Number(l.Tong_Tien) || 0), 0);
                const paidImport = filteredImports.reduce((s, l) => s + (Number(l.Da_Thanh_Toan) || 0), 0);
                const debtImport = totalImport - paidImport;

                html = `
                    <div class="space-y-3 mb-6">
                        <select id="report-inv-filter" onchange="appMobile.viewReportDetail('inventory')" 
                                class="w-full p-4 bg-white rounded-2xl border border-slate-100 shadow-sm font-black text-emerald-600 outline-none uppercase text-[11px]">
                            <option value="today" ${invFilter==='today'?'selected':''}>Hôm nay</option>
                            <option value="yesterday" ${invFilter==='yesterday'?'selected':''}>Hôm qua</option>
                            <option value="week" ${invFilter==='week'?'selected':''}>Tuần này</option>
                            <option value="month" ${invFilter==='month'?'selected':''}>Tháng này</option>
                            <option value="custom" ${invFilter==='custom'?'selected':''}>Tùy chọn ngày</option>
                        </select>

                        ${invFilter === 'custom' ? `
                            <div class="grid grid-cols-2 gap-2 animate-fadeIn">
                                <input type="date" id="inv-from" value="${invFrom || ''}" onchange="appMobile.viewReportDetail('inventory')" class="p-3 bg-white border border-slate-100 rounded-xl text-xs font-bold">
                                <input type="date" id="inv-to" value="${invTo || ''}" onchange="appMobile.viewReportDetail('inventory')" class="p-3 bg-white border border-slate-100 rounded-xl text-xs font-bold">
                            </div>
                        ` : ''}
                    </div>

                    <div class="grid grid-cols-1 gap-3 mb-6">
                        <div class="bg-emerald-600 p-5 rounded-[2rem] text-white shadow-xl shadow-emerald-100">
                            <p class="text-[10px] font-black uppercase opacity-60">Tổng tiền nhập hàng</p>
                            <p class="text-3xl font-[900]">${totalImport.toLocaleString()}đ</p>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                <p class="text-[9px] font-black text-blue-500 uppercase">Đã thanh toán</p>
                                <p class="text-sm font-black text-slate-800">${paidImport.toLocaleString()}đ</p>
                            </div>
                            <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                <p class="text-[9px] font-black text-rose-500 uppercase">Còn nợ (Công nợ)</p>
                                <p class="text-sm font-black text-slate-800">${debtImport.toLocaleString()}đ</p>
                            </div>
                        </div>
                    </div>

                    <h3 class="text-[10px] font-black text-slate-400 uppercase mb-3 ml-2 italic">● Lịch sử nhập hàng (${filteredImports.length})</h3>
                    <div class="space-y-3">
                        ${filteredImports.map(log => `
                            <div class="bg-white p-4 rounded-2xl border border-slate-50 shadow-sm flex justify-between items-center">
                                <div>
                                    <p class="font-black text-slate-800 text-[11px] uppercase">${log.Nha_Cung_Cap || 'NCC lẻ'}</p>
                                    <p class="text-[8px] text-slate-400 font-bold italic">${log.Ngay_Nhap || ''}</p>
                                </div>
                                <div class="text-right">
                                    <p class="font-black text-emerald-600 text-sm">${Number(log.Tong_Tien).toLocaleString()}đ</p>
                                    <span class="text-[7px] px-2 py-0.5 ${log.Trang_Thai === 'Hết nợ' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'} rounded-full font-black uppercase italic">
                                        ${log.Trang_Thai || 'N/A'}
                                    </span>
                                </div>
                            </div>
                        `).join('') || '<div class="py-10 text-center opacity-30 text-xs italic">Không có dữ liệu nhập hàng</div>'}
                    </div>
                `;
                break;

            case 'cash': { // Bắt đầu Block Scope để tránh báo đỏ
                title = "Sổ quỹ hệ thống";
                
                // 1. Lấy giá trị bộ lọc thời gian
                const cfType = document.getElementById('report-cash-filter')?.value || 'today';
                const cfFrom = document.getElementById('cash-from')?.value;
                const cfTo = document.getElementById('cash-to')?.value;

                const dNow = new Date();
                let sd, ed;

                // Xác định khoảng ngày
                if (cfType === 'today') {
                    sd = new Date(dNow.setHours(0,0,0,0));
                    ed = new Date(dNow.setHours(23,59,59,999));
                } else if (cfType === 'yesterday') {
                    const y = new Date(dNow); y.setDate(dNow.getDate() - 1);
                    sd = new Date(y.setHours(0,0,0,0));
                    ed = new Date(y.setHours(23,59,59,999));
                } else if (cfType === 'week') {
                    const first = dNow.getDate() - dNow.getDay() + 1;
                    sd = new Date(new Date(dNow.setDate(first)).setHours(0,0,0,0));
                    ed = new Date();
                } else if (cfType === 'month') {
                    sd = new Date(dNow.getFullYear(), dNow.getMonth(), 1);
                    ed = new Date();
                } else if (cfType === 'custom') {
                    sd = cfFrom ? new Date(cfFrom) : new Date();
                    ed = cfTo ? new Date(cfTo) : new Date();
                    ed.setHours(23,59,59,999);
                }

                // Hàm chuyển date sang số YYYYMMDD để so sánh
                const dateToVal = (dt) => parseInt(dt.toISOString().split('T')[0].replace(/-/g, ''));
                const sVal = dateToVal(sd);
                const eVal = dateToVal(ed);

                // 2. Lọc dữ liệu từ Ledger (Đã bao gồm cả Thu tự động từ Bill)
                const fullLedger = Object.values(window.dataCache.ledger || {});
                const filteredLedger = fullLedger.filter(item => {
                    if (!item.Ngay) return false;
                    const itemNum = parseInt(item.Ngay.replace(/-/g, ''));
                    return itemNum >= sVal && itemNum <= eVal;
                }).sort((a, b) => b.Id.localeCompare(a.Id));

                // 3. Tính toán 2 nguồn tiền: Tiền mặt & Chuyển khoản
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
                                <input type="date" id="cash-from" value="${cfFrom || ''}" onchange="appMobile.viewReportDetail('cash')" class="p-3 bg-white border border-slate-100 rounded-xl text-xs font-bold">
                                <input type="date" id="cash-to" value="${cfTo || ''}" onchange="appMobile.viewReportDetail('cash')" class="p-3 bg-white border border-slate-100 rounded-xl text-xs font-bold">
                            </div>
                        ` : ''}
                    </div>

                    <div class="bg-slate-900 p-6 rounded-[2.5rem] text-white mb-6 shadow-xl relative overflow-hidden">
                        <div class="relative z-10">
                            <p class="text-[10px] font-black uppercase opacity-50 italic">Tổng tồn quỹ (TM + CK)</p>
                            <p class="text-3xl font-[900] text-blue-400 mt-1">${tongTon.toLocaleString()}đ</p>
                        </div>
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
                    <div class="space-y-3">
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
            } // Kết thúc Block Scope
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
        const list = Object.entries(bookings).filter(([id, b]) => b.Ngay === viewDate && b.Trang_Thai !== "Chờ xác nhận").sort((a, b) => a[1].Bat_Dau.localeCompare(b[1].Bat_Dau));
        if (list.length === 0) {
            container.innerHTML = `<div class="py-20 text-center opacity-20"><i class="fa-solid fa-calendar-xmark text-4xl mb-2"></i><p class="font-black uppercase text-[10px]">Không có lịch đặt</p></div>`;
            return;
        }
        container.innerHTML = list.map(([id, b]) => `<div class="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div class="w-16 text-center border-r pr-4"><p class="text-xs font-black text-blue-600">${b.Bat_Dau}</p><p class="text-[9px] font-bold text-slate-300 uppercase">${b.Ket_Thuc}</p></div>
            <div class="flex-1"><div class="flex justify-between items-start"><h3 class="font-black text-slate-800 uppercase text-[11px] leading-tight">${b.Ten_Khach}</h3><span class="bg-indigo-50 text-indigo-600 text-[8px] font-black px-2 py-0.5 rounded uppercase">${courts[b.Court_ID]?.Ten_San || b.Court_ID}</span></div><p class="text-[10px] font-bold text-slate-400 mt-1">${b.SDT || 'N/A'}</p></div>
        </div>`).join('');
    },

    openBookingModal: () => {
        const modal = document.getElementById('modal-mobile-booking');
        const sheet = document.getElementById('booking-sheet');
        const courtSelect = document.getElementById('mb-court-id');
        if (courtSelect) {
            let html = '<option value="">-- Chọn sân --</option>';
            Object.entries(window.dataCache.courts || {}).forEach(([id, c]) => { html += `<option value="${id}">${c.Ten_San}</option>`; });
            courtSelect.innerHTML = html;
        }
        document.getElementById('mb-date').value = document.getElementById('view-date-mobile').value;
        modal.classList.remove('hidden');
        setTimeout(() => sheet.style.transform = "translateY(0)", 10);
    },

    closeBookingModal: () => {
        const modal = document.getElementById('modal-mobile-booking');
        const sheet = document.getElementById('booking-sheet');
        sheet.style.transform = "translateY(100%)";
        setTimeout(() => modal.classList.add('hidden'), 300);
    },

    saveBooking: async () => {
        const data = {
            Court_ID: document.getElementById('mb-court-id').value,
            Ngay: document.getElementById('mb-date').value,
            Bat_Dau: document.getElementById('mb-start').value,
            Ket_Thuc: document.getElementById('mb-end').value,
            Ten_Khach: document.getElementById('mb-name').value.trim(),
            SDT: document.getElementById('mb-phone').value.trim(),
            Tien_Coc: Number(document.getElementById('mb-deposit').value || 0),
            Trang_Thai: "Chưa nhận sân",
            Thoi_Gian_Tao: new Date().toLocaleString('vi-VN')
        };
        if (!data.Court_ID || !data.Ten_Khach || !data.Bat_Dau) return alert("⚠️ Thiếu thông tin!");
        try {
            await window.set(window.ref(window.db, `bookings/BK-MB-${Date.now()}`), data);
            alert("✅ Đã đặt lịch!");
            appMobile.closeBookingModal();
        } catch (e) { alert("Lỗi: " + e.message); }
    }
};

appMobile.init();