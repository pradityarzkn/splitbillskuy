import { useState, useEffect, useMemo } from "react"
import axios from "axios"

export default function App() {
  const [paidBy, setPaidBy] = useState("")
  const [people, setPeople] = useState([""])
  const [menu, setMenu] = useState([{ name: "", price: "" }])
  const [orders, setOrders] = useState([])
  const [tax, setTax] = useState("")
  const [service, setService] = useState("")
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    document.body.style.overflow = loading ? "hidden" : "auto"
  }, [loading])

  const formatRupiah = (num) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR"
    }).format(num || 0)

  const formatNumber = (value) => {
    if (!value) return ""
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  }

  const unformatNumber = (value) => value.replace(/\./g, "")

  // ===== PEOPLE =====
  const addPerson = () => setPeople([...people, ""])
  const updatePerson = (i, val) => {
    const copy = [...people]
    copy[i] = val
    setPeople(copy)
  }
  const removePerson = (i) => {
    setPeople(people.filter((_, idx) => idx !== i))
  }

  // ===== MENU =====
  const addMenu = () => setMenu([...menu, { name: "", price: "" }])
  const updateMenu = (i, field, val) => {
    const copy = [...menu]
    copy[i][field] = val
    setMenu(copy)
  }
  const removeMenu = (i) => {
    setMenu(menu.filter((_, idx) => idx !== i))
  }

  // ===== ORDERS =====
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
  const removeOrder = (i) => {
    setOrders(orders.filter((_, idx) => idx !== i))
  }

  // ===== DETAIL PER PERSON =====
  const getDetailPerPerson = () => {
    const menuMap = {}

    menu.forEach(m => {
      if (m.name) {
        menuMap[m.name] = Number(unformatNumber(m.price || "0"))
      }
    })

    const result = {}

    orders.forEach(o => {
      if (!o.person || !o.menu) return

      if (!result[o.person]) {
        result[o.person] = {
          items: [],
          total: 0
        }
      }

      const price = menuMap[o.menu] || 0
      const subtotal = price * o.qty

      result[o.person].items.push(`${o.menu} x${o.qty}`)
      result[o.person].total += subtotal
    })

    return result
  }

  const detail = useMemo(() => getDetailPerPerson(), [orders, menu])

  // ===== SUBMIT =====
  const handleSubmit = async () => {
    try {
      setLoading(true)

      const res = await axios.post(
        "https://splitbillskuy-api.onrender.com/calculate",
        {
          paidBy,
          tax: Number(tax || 0),
          service: Number(service || 0),
          menu: menu.map(m => ({
            name: m.name,
            price: Number(unformatNumber((m.price || "0").toString()))
          })),
          orders
        }
      )

      setResult(res.data)
    } catch (err) {
      alert("Error: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const validPeople = people.filter(p => p && p.trim() !== "")

  return (
    <div className="min-h-screen bg-gray-100">

      {/* HEADER */}
      <div className="bg-black text-white text-center py-4 text-xl font-semibold shadow">
        SplitBillskuy 💸
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
              {validPeople.map((p, i) => (
                <option key={i}>{p}</option>
              ))}
            </select>
          </Card>

          <Card title="People">
            {people.map((p, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  className="input flex-1"
                  value={p}
                  placeholder="Nama"
                  onChange={(e) => updatePerson(i, e.target.value)}
                />
                <button
                  onClick={() => removePerson(i)}
                  className="bg-red-500 text-white px-3 rounded"
                >
                  ✕
                </button>
              </div>
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

                <button
                  onClick={() => removeMenu(i)}
                  className="bg-red-500 text-white px-3 rounded"
                >
                  ✕
                </button>
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
                  {validPeople.map((p, idx) => (
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

                <button
                  onClick={() => removeOrder(i)}
                  className="bg-red-500 text-white px-3 rounded"
                >
                  ✕
                </button>
              </div>
            ))}

            <button className="btn-purple" onClick={addOrder}>
              + Tambah Order
            </button>
          </Card>

        </div>

        {/* RIGHT */}
        <div className="space-y-6">

          <Card title="Tax & Service (opsional)">
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
            disabled={loading || !paidBy}
            className="w-full bg-black text-white py-3 rounded-xl font-semibold text-lg disabled:opacity-50"
          >
            {loading ? "Calculating..." : "Calculate 💸"}
          </button>

          {result && (
            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="text-lg font-bold mb-3">Hasil</h2>

              <p>Total: <b>{formatRupiah(result.total)}</b></p>
              <p className="text-sm text-gray-500 mb-2">
                Subtotal: {formatRupiah(result.subtotal)}
              </p>

              <p className="mb-3">
                Yang bayar: <b>{paidBy}</b>
              </p>

              <div className="mb-3">
                <h3 className="font-semibold">Pesanan:</h3>

                {Object.keys(detail).map((name, i) => (
                  <div key={i} className="bg-gray-100 p-3 rounded mt-2">
                    <p className="font-medium">{name}</p>
                    <p className="text-sm text-gray-600">
                      {detail[name].items.join(", ")}
                    </p>
                    <p className="font-semibold">
                      {formatRupiah(detail[name].total)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="text-sm text-gray-600 mb-3">
                Tax: {tax || 0}% ({formatRupiah(result.taxAmount)}) <br />
                Service: {service || 0}% ({formatRupiah(result.serviceAmount)})
              </div>

              <h3 className="font-semibold mt-3">Pembayaran:</h3>

              <div className="space-y-2 mt-2">
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

      {loading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white px-6 py-4 rounded-xl shadow flex items-center gap-3">
            <div className="w-6 h-6 border-4 border-gray-300 border-t-black rounded-full animate-spin"></div>
            <span>Menghitung...</span>
          </div>
        </div>
      )}
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <h2 className="font-semibold mb-2">{title}</h2>
      {children}
    </div>
  )
}