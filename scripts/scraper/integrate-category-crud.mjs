import fs from "fs";
import path from "path";

const APP_PATH = path.resolve("scripts/scraper/output/ynab_assembled_app.html");
const INDEX_PATH = path.resolve("scripts/scraper/output/index.html");
const MODALS_DIR = path.resolve("scripts/scraper/output/test_plan_modals");

const addGroupHtml = fs.readFileSync(path.join(MODALS_DIR, "popover_add_category_group.html"), "utf8");
const addCatHtml = fs.readFileSync(path.join(MODALS_DIR, "popover_add_category.html"), "utf8");
const editGroupHtml = fs.readFileSync(path.join(MODALS_DIR, "popover_edit_category_group.html"), "utf8");
const editCatHtml = fs.readFileSync(path.join(MODALS_DIR, "popover_edit_category.html"), "utf8");

let appHtml = fs.readFileSync(APP_PATH, "utf8");

// 1. Add top nav buttons in assembly bar
const newTopNavButtons = `
      <button class="nav-btn" onclick="openModal('addCategoryGroup')">➕ Thêm Nhóm</button>
      <button class="nav-btn" onclick="openModal('addCategory')">➕ Thêm DM</button>
      <button class="nav-btn" onclick="openModal('editCategoryGroup')">✏️ Sửa Nhóm</button>
      <button class="nav-btn" onclick="openModal('editCategory')">✏️ Sửa DM</button>
`;

appHtml = appHtml.replace(
  '<button class="nav-btn" onclick="openModal(\'catEdit\')">⚙ Menu Category</button>',
  newTopNavButtons
);

// 2. Add modals into #modal-wrapper
const newModals = `
    <!-- Add Category Group Popover -->
    <div id="modal-addCategoryGroup" class="modal-item">
      ${addGroupHtml}
    </div>

    <!-- Add Category Popover -->
    <div id="modal-addCategory" class="modal-item">
      ${addCatHtml}
    </div>

    <!-- Edit Category Group Popover -->
    <div id="modal-editCategoryGroup" class="modal-item">
      ${editGroupHtml}
    </div>

    <!-- Edit Category Popover -->
    <div id="modal-editCategory" class="modal-item">
      ${editCatHtml}
    </div>
`;

appHtml = appHtml.replace(
  '<div id="modal-wrapper" onclick="handleBackdropClick(event)">',
  '<div id="modal-wrapper" onclick="handleBackdropClick(event)">' + newModals
);

// 3. Add JS interaction hooks inside budget view
const budgetCrudScript = `
    // Category & Category Group CRUD Interactivity
    function initCategoryCrudInteractions() {
      // 1. "+ Category Group" button in toolbar
      document.querySelectorAll('#view-budget button:has-text("Category Group"), #view-budget .budget-toolbar-add-category-group').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal('addCategoryGroup');
        });
      });

      // 2. Add Category (+) button on each group row
      document.querySelectorAll('#view-budget .budget-table-row.is-master-category .budget-table-cell-add-category').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal('addCategory');
        });
      });

      // 3. Edit Category Group (clicking group name)
      document.querySelectorAll('#view-budget .budget-table-row.is-master-category .budget-table-cell-edit-category').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal('editCategoryGroup');
        });
      });

      // 4. Edit Category (clicking category name in budget table)
      document.querySelectorAll('#view-budget .budget-table-row.is-sub-category .budget-table-cell-name button').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal('editCategory');
        });
      });
    }

    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', initCategoryCrudInteractions);
    } else {
      initCategoryCrudInteractions();
    }
`;

appHtml = appHtml.replace('// Call init on load', budgetCrudScript + '\n    // Call init on load');
fs.writeFileSync(APP_PATH, appHtml, "utf8");
console.log("Updated ynab_assembled_app.html with Category CRUD interactions!");

// 4. Update index.html
let indexHtml = fs.readFileSync(INDEX_PATH, "utf8");
const newIndexCards = `
    <div class="card">
      <div class="card-title">Add Category Group Popover</div>
      <div class="card-desc">Popover from '+ Category Group' toolbar button: New Category Group name input, Cancel, and OK.</div>
      <div class="btn-group">
        <a class="btn btn-primary" href="test_plan_modals/popover_add_category_group_preview.html" target="_blank">Preview Styled</a>
        <a class="btn btn-secondary" href="test_plan_modals/popover_add_category_group.png" target="_blank">View PNG</a>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Add Category Popover</div>
      <div class="card-desc">Popover from '+' button on category group header: New Category name input, Cancel, and OK.</div>
      <div class="btn-group">
        <a class="btn btn-primary" href="test_plan_modals/popover_add_category_preview.html" target="_blank">Preview Styled</a>
        <a class="btn btn-secondary" href="test_plan_modals/popover_add_category.png" target="_blank">View PNG</a>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Edit Category Group Popover</div>
      <div class="card-desc">Rename group popover with input, Hide, Delete (destructive), Cancel, and OK.</div>
      <div class="btn-group">
        <a class="btn btn-primary" href="test_plan_modals/popover_edit_category_group_preview.html" target="_blank">Preview Styled</a>
        <a class="btn btn-secondary" href="test_plan_modals/popover_edit_category_group.png" target="_blank">View PNG</a>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Edit Category Popover</div>
      <div class="card-desc">Rename category popover with input, Hide, Delete (destructive), Cancel, and OK.</div>
      <div class="btn-group">
        <a class="btn btn-primary" href="test_plan_modals/popover_edit_category_preview.html" target="_blank">Preview Styled</a>
        <a class="btn btn-secondary" href="test_plan_modals/popover_edit_category.png" target="_blank">View PNG</a>
      </div>
    </div>
`;

if (!indexHtml.includes("popover_add_category_group_preview.html")) {
  indexHtml = indexHtml.replace(
    'href="test_plan_modals/popover_month_picker_preview.html"',
    'href="test_plan_modals/popover_month_picker_preview.html"'
  ).replace(
    '</div>\n\n    <div class="card">\n      <div class="card-title">Reconcile Step 1 (Confirm Balance)</div>',
    '</div>\n' + newIndexCards + '\n    <div class="card">\n      <div class="card-title">Reconcile Step 1 (Confirm Balance)</div>'
  );
  fs.writeFileSync(INDEX_PATH, indexHtml, "utf8");
  console.log("Updated index.html with Category CRUD popovers!");
}
