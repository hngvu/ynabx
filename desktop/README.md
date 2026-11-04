# YNAB Desktop (Rust + Tauri + SQLite)

Ứng dụng Desktop cho YNABx chạy hoàn toàn offline trên máy tính người dùng:
- **Ngôn ngữ & Framework**: Rust (Tauri v2) + React / TypeScript
- **Cơ sở dữ liệu**: SQLite cục bộ (`ynab_desktop.sqlite`) thông qua `rusqlite`
- **Budget Engine**: Porting toàn bộ logic zero-based budgeting, envelope calculation, rollover, cash & credit overspending từ Spring Boot backend sang Rust thuần túy
- **Xác thực**: Đã loại bỏ hoàn toàn phần Auth/Login/Register, tự động khởi tạo và đăng nhập session cục bộ

## Cấu trúc thư mục

- `src-tauri/`:
  - `src/main.rs`: Khởi tạo Tauri, nạp SQLite database và đăng ký các IPC command handlers.
  - `src/db.rs`: Quản lý schema SQLite (bảng plans, accounts, category_groups, categories, monthly_category_allocations, transactions, payees) và khởi tạo kế hoạch chi tiêu mặc định.
  - `src/budget_calculator.rs`: Bộ tính toán phân bổ ngân sách zero-based budgeting (tính toán Available, Ready to Assign, Activity, Overspending và Credit Card funding).
  - `src/commands.rs`: Các Tauri command giao tiếp hai chiều với UI (`get_plans`, `get_accounts`, `create_account`, `get_category_groups`, `get_month_budget`, `update_category_allocation`, `get_transactions`, `save_transaction`).
  - `icons/icon.ico`: Biểu tượng chính thức của YNAB.
- `src/`:
  - `api/desktopApiClient.ts`: Bridge IPC giao tiếp trực tiếp với Tauri backend thông qua `tauriInvoke`.
  - `context/AppContext.tsx`: Quản lý state ngân sách, tự động kết nối tài khoản người dùng và bỏ qua AuthScreen.
  - `dist/`: Giao diện web đã được build tĩnh sẵn sàng đóng gói vào binary.

## Cách chạy ứng dụng

### 1. Khởi chạy binary trực tiếp
```bash
./rea/desktop/src-tauri/target/debug/ynab-desktop.exe
```

### 2. Chế độ phát triển (Dev mode)
```powershell
# Chạy UI dev server:
cd rea/desktop
npm run dev

# Hoặc chạy Tauri dev:
npm run tauri dev
```
