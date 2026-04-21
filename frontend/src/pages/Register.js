import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "delivery agent",
    vehicleType: "",
    licenseNumber: "",
    vehicleNumber: ""
  });

  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;

    let updatedForm = { ...form, [name]: value };

    // 🔥 Reset vehicle fields if role = admin
    if (name === "role" && value === "admin") {
      updatedForm.vehicleType = "";
      updatedForm.licenseNumber = "";
      updatedForm.vehicleNumber = "";
    }

    setForm(updatedForm);
  };

  // ✅ Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let payload = { ...form };

      // 🔥 Remove vehicle fields for admin
      if (form.role === "admin") {
        delete payload.vehicleType;
        delete payload.licenseNumber;
        delete payload.vehicleNumber;
      }

      await axios.post("/api/auth/register", payload);

      alert("User registered successfully!");
      navigate("/login");

    } catch (err) {
      console.error("REGISTER ERROR:", err.response?.data);
      alert(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: 450,
      margin: "40px auto",
      padding: 24,
      border: "1px solid #e5e7eb",
      borderRadius: 12
    }}>
      <h2 style={{ textAlign: "center", marginBottom: 20 }}>
        Register User
      </h2>

      <form onSubmit={handleSubmit}>

        <input
          name="name"
          placeholder="Full Name"
          className="form-control"
          onChange={handleChange}
        />

        <input
          name="email"
          type="email"
          placeholder="Email"
          className="form-control"
          onChange={handleChange}
        />

        <input
          name="phone"
          placeholder="Phone"
          className="form-control"
          onChange={handleChange}
        />

        {/* Role */}
        <select
          name="role"
          className="form-control"
          onChange={handleChange}
        >
          <option value="delivery agent">Delivery Agent</option>
          <option value="admin">Admin</option>
        </select>

        {/* Password */}
        <div style={{ position: "relative" }}>
          <input
            name="password"
            type={showPw ? "text" : "password"}
            placeholder="Password"
            className="form-control"
            onChange={handleChange}
            style={{ paddingRight: 40 }}
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              border: "none",
              background: "none",
              cursor: "pointer"
            }}
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {/* 🚗 Show only for delivery agent */}
        {form.role === "delivery agent" && (
          <>
            <select
              name="vehicleType"
              className="form-control"
              onChange={handleChange}
            >
              <option value="">Select Vehicle Type</option>
              <option value="low">Low Size</option>
              <option value="mid">Mid Size</option>
              <option value="heavy">Heavy</option>
            </select>

            <input
              name="licenseNumber"
              placeholder="License Number"
              className="form-control"
              onChange={handleChange}
            />

            <input
              name="vehicleNumber"
              placeholder="Vehicle Number"
              className="form-control"
              onChange={handleChange}
            />
          </>
        )}

        <button
          type="submit"
          style={{
            width: "100%",
            marginTop: 12,
            padding: 10,
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 6
          }}
          disabled={loading}
        >
          {loading ? "Registering..." : "Register"}
        </button>
      </form>

      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate("/login")}
        style={{
          width: "100%",
          marginTop: 12,
          padding: 10,
          background: "#6b7280",
          color: "#fff",
          border: "none",
          borderRadius: 6
        }}
      >
        Back to Login page
      </button>
    </div>
  );
}

export default Register;