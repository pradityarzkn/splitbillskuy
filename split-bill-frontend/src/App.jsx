import { useState, useEffect, useMemo, useRef } from "react"
import axios from "axios"
import html2canvas from "html2canvas"

export default function App() {
  const [paidBy, setPaidBy] = useState("")
  const [people, setPeople] = useState([""])
  const [menu, setMenu] = useState([{ name: "", price: "" }])
  const [orders, setOrders] = useState([])
  const [tax, setTax] = useState("")
  const [service, setService] = useState("")
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const resultRef = useRef()

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
        persons: [],
        menu: "",
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

  // ===== DETAIL =====
  const getDetailPerPerson = () => {
    const menuMap = {}

    menu.forEach(m => {
      if (m.name) {
        menuMap[m.name] = Number(unformatNumber(m.price || "0"))
      }
    })

    const result = {}

    orders.forEach(o => {
      if (!o.persons || o.persons.length === 0 || !o.menu) return

      const price = menuMap[o.menu] || 0
      const total = price * o.qty
      const split = total / o.persons.length

      o.persons.forEach(p => {
        if (!result[p]) {
          result[p] = { items: [], total: 0 }
        }

        result[p].items.push(`${o.menu} x${o.qty} (share)`)
        result[p].total += split
      })
    })

    return result
  }

  const detail = useMemo(() => getDetailPerPerson(), [orders, menu])

  // ===== VALID =====
  const validPeople = people.filter(p => p && p.trim() !== "")
  const validMenu = menu.filter(m => m.name && m.price)
  const validOrders = orders.filter(
    o => o.persons && o.persons.length > 0 && o.menu && o.qty > 0
  )

  // ===== SUBMIT =====
  const handleSubmit = async () => {
    if (!paidBy) return alert("Pilih siapa yang bayar")
    if (validMenu.length === 0) return alert("Menu belum diisi")
    if (validOrders.length === 0) return alert("Order belum diisi")

    try {
      setLoading(true)

      const res = await axios.post(
        "https://splitbillskuy-api.onrender.com/calculate",
        {
          paidBy,
          tax: Number(tax || 0),
          service: Number(service || 0),
          menu: validMenu.map(m => ({
            name: m.name,
            price: Number(unformatNumber(m.price))
          })),
          orders: validOrders
        }
      )

      setResult(res.data)
    } catch (err) {
      console.log(err.response?.data)
      alert("Error: " + (err.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  // ===== EXPORT =====
  const handleExport = async () => {
    if (!resultRef.current) return

    const canvas = await html2canvas(resultRef.current, {
      backgroundColor: "#ffffff",
      scale: 2
    })

    const link = document.createElement("a")
    link.download = "splitbill.png"
    link.href = canvas.toDataURL()
    link.click()
  }

  return (
    <div className="min-h-screen bg-gray-100">

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
                <option key={i} value={p}>{p}</option>
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
                <button onClick={() => removePerson(i)} className="bg-red-500 text-white px-3 rounded">
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
                  value={formatNumber(m.price)}
                  placeholder="Harga"
                  onChange={(e) => {
                    const raw = unformatNumber(e.target.value)
                    if (!isNaN(raw)) updateMenu(i, "price", raw)
                  }}
                />
                <button onClick={() => removeMenu(i)} className="bg-red-500 text-white px-3 rounded">
                  ✕
                </button>
              </div>
            ))}
            <button className="btn-green" onClick={addMenu}>
              + Tambah Menu
            </button>
          </Card>

          {/* ORDERS */}
          <Card title="Orders">
            {orders.map((o, i) => (
              <div key={i} className="mb-3 bg-gray-50 p-3 rounded">

                <div className="flex gap-2 mb-2">
                  <select
                    className="input flex-1"
                    value={o.menu || ""}
                    onChange={(e) => updateOrder(i, "menu", e.target.value)}
                  >
                    <option value="">-- pilih menu --</option>
                    {validMenu.map((m, idx) => (
                      <option key={idx} value={m.name}>{m.name}</option>
                    ))}
                  </select>

                  <input
                    className="input w-20"
                    type="number"
                    value={o.qty}
                    onChange={(e) => updateOrder(i, "qty", e.target.value)}
                  />

                  <button onClick={() => removeOrder(i)} className="bg-red-500 text-white px-3 rounded">
                    ✕
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {validPeople.map((p, idx) => (
                    <label key={idx} className="flex items-center gap-1 text-sm bg-white px-2 py-1 rounded border">
                      <input
                        type="checkbox"
                        checked={o.persons?.includes(p) || false}
                        onChange={(e) => {
                          let updated = o.persons || []

                          if (e.target.checked) {
                            updated = [...updated, p]
                          } else {
                            updated = updated.filter(x => x !== p)
                          }

                          updateOrder(i, "persons", updated)
                        }}
                      />
                      {p}
                    </label>
                  ))}
                </div>

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
                type="number"
                placeholder="Tax (%)"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
              />
              <input
                className="input w-1/2"
                type="number"
                placeholder="Service (%)"
                value={service}
                onChange={(e) => setService(e.target.value)}
              />
            </div>
          </Card>

          <button
            onClick={handleSubmit}
            disabled={loading || !paidBy}
            className="w-full bg-black text-white py-3 rounded-xl"
          >
            {loading ? "Calculating..." : "Calculate 💸"}
          </button>

          {result && (
            <>
              <div ref={resultRef} className="bg-white p-6 rounded-xl shadow">
                <h2 className="font-bold mb-2">Hasil</h2>

                <p>Total: <b>{formatRupiah(result.total)}</b></p>
                <p>Yang bayar: <b>{paidBy}</b></p>

                {Object.keys(detail).map((name, i) => (
                  <div key={i} className="bg-gray-100 p-2 mt-2 rounded">
                    <b>{name}</b><br />
                    {detail[name].items.join(", ")}<br />
                    <b>{formatRupiah(detail[name].total)}</b>
                  </div>
                ))}

                <div className="mt-2 text-sm">
                  Tax: {tax || 0}% | Service: {service || 0}%
                </div>

                <div className="mt-2">
                  {result.transfers.map((t, i) => (
                    <div key={i}>
                      {t.from} ➜ {t.to} : {formatRupiah(t.amount)}
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleExport} className="w-full bg-green-600 text-white py-2 rounded">
                Export ke Gambar 📸
              </button>
            </>
          )}

        </div>
      </div>
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