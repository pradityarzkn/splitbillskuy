import { useState } from "react"
import axios from "axios"

export default function App() {
  const [paidBy, setPaidBy] = useState("")
  const [people, setPeople] = useState([""])
  const [menu, setMenu] = useState([{ name: "", price: "" }])
  const [orders, setOrders] = useState([])
  const [tax, setTax] = useState("")
  const [service, setService] = useState("")
  const [result, setResult] = useState(null)

  const formatRupiah = (num) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR"
    }).format(num)

  // ---- People ----
  const addPerson = () => setPeople([...people, ""])
  const updatePerson = (i, val) => {
    const copy = [...people]
    copy[i] = val
    setPeople(copy)
  }

  // ---- Menu ----
  const addMenu = () => setMenu([...menu, { name: "", price: "" }])
  const updateMenu = (i, field, val) => {
    const copy = [...menu]
    copy[i][field] = val
    setMenu(copy)
  }

  // ---- Orders ----
  const addOrder = () =>
    setOrders([
      ...orders,
      {
        person: people.find(p => p) || "",
        menu: menu.find(m => m.name)?.name || "",
        qty: 1
      }
    ])

  const updateOrder = (i, field, val) => {
    const copy = [...orders]
    copy[i][field] = field === "qty" ? Number(val) : val
    setOrders(copy)
  }

  // ---- Submit ----
  const handleSubmit = async () => {
    try {
      const res = await axios.post(
        "https://splitbillskuy-api.onrender.com/calculate",
        {
          paidBy,
          tax: Number(tax || 0),
          service: Number(service || 0),
          menu: menu.map(m => ({
            name: m.name,
            price: Number((m.price || "0").toString().replace(/\./g, ""))
          })),
          orders
        }
      )
      setResult(res.data)
    } catch (err) {
      alert("Error: " + err.message)
    }
  }

  const formatNumber = (value) => {
    if (!value) return ""
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  }

  const unformatNumber = (value) => {
    return value.replace(/\./g, "")
  }

  return (
    <div className="min-h-screen bg-gray-100">

      {/* HEADER */}
      <div className="bg-black text-white text-center py-4 text-xl font-semibold shadow">
        Split Bill App 💸
      </div>

      <div className="max-w-6xl mx-auto p-6 grid md:grid-cols-2 gap-6">

        {/* LEFT */}
        <div className="space-y-6">

          <Card title="Siapa yang bayar?">
            <select
              className="input"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
            >
              <option value="">-- pilih --</option>
              {people.filter(p => p).map((p, i) => (
                <option key={i}>{p}</option>
              ))}
            </select>
          </Card>

          <Card title="People">
            {people.map((p, i) => (
              <input
                key={i}
                className="input mb-2"
                value={p}
                placeholder="Nama"
                onChange={(e) => updatePerson(i, e.target.value)}
              />
            ))}
            <button className="btn-blue" onClick={addPerson}>
              + Tambah Orang
            </button>
          </Card>

          <Card title="Menu">
            {menu.map((m, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  className="input w-1/2"
                  value={m.name}
                  placeholder="Nama menu"
                  onChange={(e) => updateMenu(i, "name", e.target.value)}
                />

                <input
                  className="input w-1/2"
                  type="text"
                  value={formatNumber(m.price)}
                  placeholder="Harga"
                  onChange={(e) => {
                    const raw = unformatNumber(e.target.value)
                    if (!isNaN(raw)) {
                      updateMenu(i, "price", raw)
                    }
                  }}
                />
              </div>
            ))}
            <button className="btn-green" onClick={addMenu}>
              + Tambah Menu
            </button>
          </Card>

          <Card title="Orders">
            {orders.map((o, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <select
                  className="input"
                  value={o.person}
                  onChange={(e) => updateOrder(i, "person", e.target.value)}
                >
                  <option value="">-- pilih --</option>
                  {people.filter(p => p).map((p, idx) => (
                    <option key={idx}>{p}</option>
                  ))}
                </select>

                <select
                  className="input"
                  value={o.menu}
                  onChange={(e) => updateOrder(i, "menu", e.target.value)}
                >
                  <option value="">-- pilih --</option>
                  {menu.filter(m => m.name).map((m, idx) => (
                    <option key={idx}>{m.name}</option>
                  ))}
                </select>

                <input
                  className="input w-20"
                  type="number"
                  value={o.qty}
                  onChange={(e) => updateOrder(i, "qty", e.target.value)}
                />
              </div>
            ))}

            <button className="btn-purple" onClick={addOrder}>
              + Tambah Order
            </button>
          </Card>

        </div>

        {/* RIGHT */}
        <div className="space-y-6">

          <Card title="Tax & Service">
            <div className="flex gap-2">
              <input
                className="input w-1/2"
                placeholder="Tax %"
                type="number"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
              />
              <input
                className="input w-1/2"
                placeholder="Service %"
                type="number"
                value={service}
                onChange={(e) => setService(e.target.value)}
              />
            </div>
          </Card>

          <button
            onClick={handleSubmit}
            className="w-full bg-black text-white py-3 rounded-xl font-semibold text-lg hover:opacity-90"
          >
            Calculate 💸
          </button>

          {result && (
            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="text-lg font-bold mb-3">Hasil</h2>

              <p className="mb-2">
                Total: <b>{formatRupiah(result.total)}</b>
              </p>

              <div className="space-y-2">
                {result.transfers.map((t, i) => (
                  <div key={i} className="bg-gray-100 p-2 rounded">
                    {t.from} ➜ {t.to} :{" "}
                    <b>{formatRupiah(t.amount)}</b>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// reusable card
function Card({ title, children }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <h2 className="font-semibold mb-2">{title}</h2>
      {children}
    </div>
  )
}
