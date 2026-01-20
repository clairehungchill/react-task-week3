import { useEffect, useRef, useState } from "react";
import axios from "axios";
import * as bootstrap from "bootstrap";
import "./assets/style.css";
// API 設定
const API_BASE = import.meta.env.VITE_API_BASE;
const API_PATH = import.meta.env.VITE_API_PATH;

// 建立 Axios 實體，並設定 baseURL
const apiRequest = axios.create({
  baseURL: API_BASE,
});

const INITIAL_TEMPLATE_DATA = {
  id: "",
  title: "",
  category: "",
  origin_price: "",
  price: "",
  unit: "",
  description: "",
  content: "",
  is_enabled: false,
  imageUrl: "",
  imagesUrl: [],
};

export default function App() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [isAuth, setIsAuth] = useState(false);
  const [products, setProducts] = useState([]);

  // Modal 控制相關狀態
  const productModalRef = useRef(null);
  const [modalType, setModalType] = useState(""); // "create", "edit", "delete", "view"
  // 產品表單資料模板
  const [templateProduct, setTemplateProduct] = useState(INITIAL_TEMPLATE_DATA);

  // 表單輸入處理
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // console.log(name, value);
    setFormData((preData) => ({ ...preData, [name]: value }));
  };

  const handleModalInputChange = (e) => {
    const { name, value, checked, type } = e.target;
    // console.log(name, value);
    setTemplateProduct((preData) => ({
      ...preData,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // 圖片處理
  const handleModalImageChange = (index, value) => {
    setTemplateProduct((pre) => {
      const newImages = [...pre.imagesUrl];
      newImages[index] = value;

      // 填寫最後一個空輸入框時，自動新增空白輸入框
      if (
        value !== "" &&
        index === newImages.length - 1 &&
        newImages.length < 5
      ) {
        newImages.push("");
      }

      // 清空輸入框時，移除最後的空白輸入框
      if (
        value === "" &&
        newImages.length > 1 &&
        newImages[newImages.length - 1] === ""
      ) {
        newImages.pop();
      }

      return {
        ...pre,
        imagesUrl: newImages,
      };
    });
  };

  // 新增圖片
  const handleAddImage = () => {
    setTemplateProduct((pre) => {
      const newImages = [...pre.imagesUrl];
      newImages.push("");
      return {
        ...pre,
        imagesUrl: newImages,
      };
    });
  };

  // 移除圖片
  const handleRemoveImage = () => {
    setTemplateProduct((pre) => {
      const newImages = [...pre.imagesUrl];
      newImages.pop();
      return {
        ...pre,
        imagesUrl: newImages,
      };
    });
  };

  // 取得產品資料
  const getProducts = async () => {
    try {
      const response = await apiRequest.get(`/api/${API_PATH}/admin/products`);
      // console.log("產品資料：", response.data);
      setProducts(response.data.products);
    } catch (error) {
      console.log("取得產品失敗：", error.response?.data);
    }
  };

  // 新增/更新產品
  const updateProduct = async (id) => {
    let url;
    let method;

    if (modalType === "edit") {
      url = `/api/${API_PATH}/admin/product/${id}`;
      method = "put";
    } else if (modalType === "create") {
      url = `/api/${API_PATH}/admin/product`;
      method = "post";
    }

    const productData = {
      data: {
        ...templateProduct,
        origin_price: Number(templateProduct.origin_price), // 轉換為數字
        price: Number(templateProduct.price), // 轉換為數字
        is_enabled: templateProduct.is_enabled ? 1 : 0, // 轉換為數字
        imagesUrl: templateProduct.imagesUrl.filter((url) => url !== ""), // 過濾空白
      },
    };
    try {
      // const response = await apiRequest[method](url, productData);
      // console.log("新增產品：", response);
      await apiRequest[method](url, productData);
      getProducts();
      closeModal();
    } catch (error) {
      console.log("新增產品失敗：", error.response);
    }
  };

  // 刪除產品
  const deleteProduct = async (id) => {
    try {
      // const response = await apiRequest.delete(
      //   `/api/${API_PATH}/admin/product/${id}`,
      // );
      // console.log("刪除成功：", response);
      await apiRequest.delete(`/api/${API_PATH}/admin/product/${id}`);
      // 關閉 Modal 並重新載入資料
      closeModal();
      getProducts();
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      console.error("刪除失敗：", errorMsg);
      alert("刪除失敗：" + errorMsg);
    }
  };

  useEffect(() => {
    // 從 Cookie 取得 Token
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("hexToken="))
      ?.split("=")[1];
    // console.log("目前 Token:", token);

    // 檢查登入狀態
    if (token) {
      apiRequest.defaults.headers.common["Authorization"] = token;
    }

    // 初始化 Bootstrap Modal
    productModalRef.current = new bootstrap.Modal("#productModal", {
      keyboard: false,
    });

    // Modal 關閉時移除焦點
    document
      .querySelector("#productModal")
      .addEventListener("hide.bs.modal", () => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      });

    // 檢查管理員權限
    const checkLogin = async () => {
      try {
        // const response = await apiRequest.post(`/api/user/check`);
        // console.log("Token 驗證成功：", response);
        await apiRequest.post(`/api/user/check`);
        setIsAuth(true);
        getProducts();
      } catch (error) {
        console.log("Token 驗證失敗：", error.response?.data);
      }
    };
    checkLogin();
  }, []);

  // 登入
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await apiRequest.post(`/admin/signin`, formData);
      // console.log(response.data);
      const { token, expired } = response.data;
      // 儲存 Token 到 Cookie
      document.cookie = `hexToken=${token};expires=${new Date(expired)};`;
      // 設定 axios 預設 header
      apiRequest.defaults.headers.common["Authorization"] = token;
      getProducts();
      setIsAuth(true);
    } catch (error) {
      setIsAuth(false);
      console.log("登入失敗: ", error.response?.data);
    }
  };

  const openModal = (type, product) => {
    // console.log("type:", type, "product:", product);
    // console.log("templateProduct:", templateProduct);
    // console.log("product:", product);
    setModalType(type);
    // setTemplateProduct((prev) => ({ ...prev, ...product }));
    // 上面這樣寫可能會吃到上一筆產品的副圖（假如此筆產品沒有附圖時）
    setTemplateProduct({
      ...INITIAL_TEMPLATE_DATA,
      ...product,
    });
    productModalRef.current.show();
  };

  const closeModal = () => {
    productModalRef.current.hide();
  };

  return (
    <>
      {!isAuth ? (
        <div className="login-page">
          <div className="login-card">
            <h2 className="login-title">請先登入</h2>
            <form
              className="form-floating"
              onSubmit={(e) => {
                handleSubmit(e);
              }}
            >
              <div className="form-floating mb-3">
                <input
                  type="email"
                  className="form-control"
                  id="username"
                  name="username"
                  placeholder="name@example.com"
                  value={formData.username}
                  onChange={(e) => handleInputChange(e)}
                  required
                />
                <label htmlFor="username">Email address</label>
              </div>
              <div className="form-floating">
                <input
                  type="password"
                  className="form-control"
                  id="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => handleInputChange(e)}
                  required
                />
                <label htmlFor="password">Password</label>
              </div>
              <button type="submit" className="btn login-btn w-100 mt-3">
                登入
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="container admin-shell">
          <div className="admin-topbar">
            <div className="admin-topbar__left">
              <h1 className="admin-title">產品後台</h1>
            </div>
            <div className="admin-topbar__right">
              <div className="login-status">
                <span
                  className={`login-dot ${
                    isAuth ? "login-dot--on" : "login-dot--off"
                  }`}
                />
                <span className="login-text">
                  {isAuth ? "已登入" : "未登入"}
                </span>
              </div>
            </div>
          </div>
          <div className="admin-panel">
            <div className="section-header">
              <h2 className="section-title">產品列表</h2>
              <button
                type="button"
                className="action-btn--add"
                onClick={() => openModal("create", INITIAL_TEMPLATE_DATA)}
              >
                <i className="bi bi-plus-lg"></i>
                建立新產品
              </button>
            </div>
            <div className="table-card">
              <table className="product-table">
                <thead className="product-table__head">
                  <tr>
                    <th scope="col" className="th-center">
                      圖片
                    </th>
                    <th scope="col" className="th-left">
                      產品名稱
                    </th>
                    <th scope="col" className="th-center">
                      分類
                    </th>
                    <th scope="col" className="th-center">
                      原價
                    </th>
                    <th scope="col" className="th-center">
                      售價
                    </th>
                    <th scope="col" className="th-center">
                      啟用
                    </th>
                    <th scope="col" className="th-center th-actions">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="product-table__body">
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td className="td-center">
                        <img
                          className="thumb-img"
                          src={product.imageUrl}
                          alt={product.title}
                        />
                      </td>
                      <td className="td-left">{product.title}</td>
                      <td className="td-center">{product.category}</td>
                      <td className="td-center">${product.origin_price}</td>
                      <td className="td-center">${product.price}</td>
                      <td className="td-center">
                        <span
                          className={`status ${
                            product.is_enabled ? "status--on" : "status--off"
                          }`}
                        >
                          {product.is_enabled ? "已啟用" : "未啟用"}
                        </span>
                      </td>
                      <td className="td-center">
                        <div className="row-actions">
                          <button
                            className="action-btn action-btn--view"
                            type="button"
                            onClick={() => {
                              openModal("view", product);
                            }}
                          >
                            <i className="bi bi-eye"></i>
                            查看
                          </button>
                          <button
                            className="action-btn action-btn--edit"
                            type="button"
                            onClick={() => {
                              openModal("edit", product);
                            }}
                          >
                            <i className="bi bi-pencil-square"></i>
                            編輯
                          </button>
                          <button
                            className="action-btn action-btn--delete"
                            type="button"
                            onClick={() => {
                              openModal("delete", product);
                            }}
                          >
                            <i className="bi bi-trash3"></i>
                            刪除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <div
        className="modal fade product-modal"
        id="productModal"
        tabIndex="-1"
        aria-labelledby="productModalLabel"
        aria-hidden="true"
        ref={productModalRef}
      >
        <div className="modal-dialog modal-xl">
          <div className="modal-content border-0">
            <div
              className={`modal-header ${modalType === "delete" ? "is-danger" : "is-default"}`}
            >
              <h5 id="productModalLabel" className="modal-title">
                <span>
                  {modalType === "delete"
                    ? "刪除"
                    : modalType === "edit"
                      ? "編輯"
                      : modalType === "view"
                        ? "查看"
                        : "新增"}
                  產品
                </span>
              </h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              {modalType === "delete" ? (
                <p className="delete-text">
                  確定要刪除
                  <span className="delete-text__name">
                    {templateProduct.title}
                  </span>
                  嗎？
                </p>
              ) : modalType === "view" ? (
                <div className="row modal-form">
                  <div className="col-sm-4">
                    <div className="mb-3">
                      <div className="form-label">主圖</div>
                      {templateProduct.imageUrl ? (
                        <img
                          className="modal-image-preview"
                          src={templateProduct.imageUrl}
                          alt={templateProduct.title || "主圖"}
                        />
                      ) : (
                        <div className="empty-preview">尚未提供主圖</div>
                      )}
                    </div>
                    {/* 副圖：只有在有至少一張副圖時才顯示 */}
                    {Array.isArray(templateProduct.imagesUrl) &&
                      templateProduct.imagesUrl.some((url) => url) && (
                        <div className="mb-3">
                          <div className="form-label">副圖</div>
                          {templateProduct.imagesUrl
                            .filter((url) => url)
                            .map((url, index) => (
                              <img
                                key={index}
                                className="modal-image-preview mb-3"
                                src={url}
                                alt={`副圖${index + 1}`}
                              />
                            ))}
                        </div>
                      )}
                  </div>
                  <div className="col-sm-8">
                    <div className="mb-3">
                      <div className="form-label">標題</div>
                      <div className="field-value">
                        {templateProduct.title || "—"}
                      </div>
                    </div>
                    <div className="row">
                      <div className="mb-3 col-md-6">
                        <div className="form-label">分類</div>
                        <div className="field-value">
                          {templateProduct.category || "—"}
                        </div>
                      </div>
                      <div className="mb-3 col-md-6">
                        <div className="form-label">單位</div>
                        <div className="field-value">
                          {templateProduct.unit || "—"}
                        </div>
                      </div>
                    </div>
                    <div className="row">
                      <div className="mb-3 col-md-6">
                        <div className="form-label">原價</div>
                        <div className="field-value">
                          {templateProduct.origin_price ?? "—"}
                        </div>
                      </div>
                      <div className="mb-3 col-md-6">
                        <div className="form-label">售價</div>
                        <div className="field-value">
                          {templateProduct.price ?? "—"}
                        </div>
                      </div>
                    </div>
                    <div className="mb-3">
                      <div className="form-label">產品描述</div>
                      <div className="field-value field-value--multiline">
                        {templateProduct.description || "—"}
                      </div>
                    </div>
                    <div className="mb-3">
                      <div className="form-label">說明內容</div>
                      <div className="field-value field-value--multiline">
                        {templateProduct.content || "—"}
                      </div>
                    </div>
                    <div className="mb-3">
                      <div className="form-label">是否啟用</div>
                      <div className="field-value">
                        {templateProduct.is_enabled ? "已啟用" : "未啟用"}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="row">
                  <div className="col-sm-4">
                    <div className="mb-2">
                      <label htmlFor="imageUrl" className="form-label">
                        輸入圖片網址
                      </label>
                      <input
                        type="text"
                        id="imageUrl"
                        name="imageUrl"
                        className="form-control"
                        placeholder="請輸入圖片連結"
                        value={templateProduct.imageUrl}
                        onChange={handleModalInputChange}
                      />
                      {templateProduct.imageUrl && (
                        <img
                          className="modal-image-preview"
                          src={templateProduct.imageUrl}
                          alt="主圖"
                        />
                      )}
                    </div>
                    <div>
                      {templateProduct.imagesUrl.map((url, index) => {
                        return (
                          <div key={index} className="modal-image-field">
                            <label htmlFor="imageUrl" className="form-label">
                              輸入圖片網址
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder={`圖片網址${index + 1}`}
                              value={url}
                              onChange={(e) => {
                                handleModalImageChange(index, e.target.value);
                              }}
                            />
                            {url && (
                              <img
                                className="modal-image-preview"
                                src={url}
                                alt={`副圖${index + 1}`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {templateProduct.imagesUrl.length < 5 &&
                      templateProduct.imagesUrl[
                        templateProduct.imagesUrl.length - 1
                      ] !== "" && (
                        <button
                          type="button"
                          className="modal-action-btn modal-action-btn--add mb-2"
                          onClick={handleAddImage}
                        >
                          <i className="bi bi-plus-lg"></i>
                          新增圖片
                        </button>
                      )}
                    {templateProduct.imagesUrl.length >= 1 && (
                      <button
                        type="button"
                        className="modal-action-btn modal-action-btn--delete"
                        onClick={handleRemoveImage}
                      >
                        <i className="bi bi-trash3"></i>
                        刪除圖片
                      </button>
                    )}
                  </div>
                  <div className="col-sm-8">
                    <div className="mb-3">
                      <label htmlFor="title" className="form-label">
                        標題
                      </label>
                      <input
                        name="title"
                        id="title"
                        type="text"
                        className="form-control"
                        placeholder="請輸入標題"
                        value={templateProduct.title}
                        onChange={handleModalInputChange}
                      />
                    </div>
                    <div className="row">
                      <div className="mb-3 col-md-6">
                        <label htmlFor="category" className="form-label">
                          分類
                        </label>
                        <input
                          name="category"
                          id="category"
                          type="text"
                          className="form-control"
                          placeholder="請輸入分類"
                          value={templateProduct.category}
                          onChange={handleModalInputChange}
                        />
                      </div>
                      <div className="mb-3 col-md-6">
                        <label htmlFor="unit" className="form-label">
                          單位
                        </label>
                        <input
                          name="unit"
                          id="unit"
                          type="text"
                          className="form-control"
                          placeholder="請輸入單位"
                          value={templateProduct.unit}
                          onChange={handleModalInputChange}
                        />
                      </div>
                    </div>
                    <div className="row">
                      <div className="mb-3 col-md-6">
                        <label htmlFor="origin_price" className="form-label">
                          原價
                        </label>
                        <input
                          name="origin_price"
                          id="origin_price"
                          type="number"
                          min="0"
                          className="form-control"
                          placeholder="請輸入原價"
                          value={templateProduct.origin_price}
                          onChange={handleModalInputChange}
                        />
                      </div>
                      <div className="mb-3 col-md-6">
                        <label htmlFor="price" className="form-label">
                          售價
                        </label>
                        <input
                          name="price"
                          id="price"
                          type="number"
                          min="0"
                          className="form-control"
                          placeholder="請輸入售價"
                          value={templateProduct.price}
                          onChange={handleModalInputChange}
                        />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label htmlFor="description" className="form-label">
                        產品描述
                      </label>
                      <textarea
                        name="description"
                        id="description"
                        className="form-control"
                        placeholder="請輸入產品描述"
                        value={templateProduct.description}
                        onChange={handleModalInputChange}
                      ></textarea>
                    </div>
                    <div className="mb-3">
                      <label htmlFor="content" className="form-label">
                        說明內容
                      </label>
                      <textarea
                        name="content"
                        id="content"
                        className="form-control"
                        placeholder="請輸入說明內容"
                        value={templateProduct.content}
                        onChange={handleModalInputChange}
                      ></textarea>
                    </div>
                    <div className="mb-3">
                      <div className="form-check">
                        <input
                          name="is_enabled"
                          id="is_enabled"
                          className="form-check-input"
                          type="checkbox"
                          checked={templateProduct.is_enabled}
                          onChange={handleModalInputChange}
                        />
                        <label
                          className="form-check-label"
                          htmlFor="is_enabled"
                        >
                          是否啟用
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {modalType === "delete" ? (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => deleteProduct(templateProduct.id)}
                >
                  刪除
                </button>
              ) : modalType === "view" ? (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={closeModal}
                  data-bs-dismiss="modal"
                >
                  關閉
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    data-bs-dismiss="modal"
                    onClick={() => closeModal()}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      updateProduct(templateProduct.id);
                    }}
                  >
                    確認
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
