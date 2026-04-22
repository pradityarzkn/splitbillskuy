const express = require("express")
const cors = require("cors")

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

app.get("/", (req, res) => {
  res.send("Split Bill API FINAL 🚀")
})

app.post("/calculate", (req, res) => {
  const { paidBy, menu, orders, tax = 0, service = 0 } = req.body

  // validasi
  if (!paidBy || !menu || !orders) {
    return res.status(400).json({
      error: "paidBy, menu, orders wajib diisi"
    })
  }

  // 1. map menu
  const menuMap = {}
  menu.forEach(m => {
    menuMap[m.name] = m.price
  })

  // 2. subtotal per orang
  const personSubtotal = {}
  let subtotal = 0

  orders.forEach(o => {
    const price = menuMap[o.menu]

    if (!price) {
      return res.status(400).json({
        error: `Menu ${o.menu} tidak ditemukan`
      })
    }

    const amount = price * o.qty

    if (!personSubtotal[o.person]) {
      personSubtotal[o.person] = 0
    }

    personSubtotal[o.person] += amount
    subtotal += amount
  })

  // 3. hitung tax & service
  const taxAmount = subtotal * (tax / 100)
  const serviceAmount = subtotal * (service / 100)
  const total = subtotal + taxAmount + serviceAmount

  // 4. init balance
  const balances = {}

  Object.keys(personSubtotal).forEach(p => {
    balances[p] = 0
  })

  // 5. distribusi biaya (include tax & service)
  Object.keys(personSubtotal).forEach(p => {
    const ratio = personSubtotal[p] / subtotal

    const finalShare =
      personSubtotal[p] +
      (taxAmount * ratio) +
      (serviceAmount * ratio)

    balances[p] -= finalShare
  })

  // 6. yang bayar cover semua
  balances[paidBy] = (balances[paidBy] || 0) + total

  // 7. pisahin creditor & debtor
  const creditors = []
  const debtors = []

  Object.keys(balances).forEach(name => {
    const val = Math.round(balances[name])

    if (val > 0) {
      creditors.push({ name, amount: val })
    } else if (val < 0) {
      debtors.push({ name, amount: -val })
    }
  })

  // 8. settlement
  const transfers = []

  let i = 0, j = 0

  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i]
    const c = creditors[j]

    const pay = Math.min(d.amount, c.amount)

    transfers.push({
      from: d.name,
      to: c.name,
      amount: pay
    })

    d.amount -= pay
    c.amount -= pay

    if (d.amount === 0) i++
    if (c.amount === 0) j++
  }

  res.json({
    subtotal,
    taxAmount,
    serviceAmount,
    total,
    balances,
    transfers
  })
})

app.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT}`)
})
